import { Injectable } from '@nestjs/common';
import { Shift } from '@/domain/shift/entities/shift.entity';
import {
  ShiftFilters,
  ShiftRepository,
} from '@/domain/shift/repositories/shift.repository';
import { ShiftId } from '@/domain/shift/value-objects/shift-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { UserId } from '@/domain/user/entities/user.entity';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import {
  Prisma,
  type shifts as ShiftRow,
  type shift_staff_members as ShiftStaffRow,
} from '@/infrastructure/persistence/prisma/generated/client';
import { fromSqlTime, toSqlTime } from './sql-time.util';

type ShiftRowWithStaff = ShiftRow & {
  shift_staff_members: ShiftStaffRow[];
};

const WITH_STAFF = { shift_staff_members: true } as const;

/** An open-ended shift (end_date NULL) never stops, so it overlaps any later window. */
const overlapsWindow = (
  from: Date,
  to: Date,
): Prisma.shiftsWhereInput => ({
  start_date: { lte: to },
  OR: [{ end_date: null }, { end_date: { gte: from } }],
});

const OPEN_ENDED_UPPER_BOUND = new Date('9999-12-31T00:00:00.000Z');

@Injectable()
export class PrismaShiftRepository implements ShiftRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(shift: Shift): Promise<string> {
    const id = shift.getId()?.toString();

    const data = {
      name: shift.getName(),
      start_date: shift.getStartDate(),
      end_date: shift.getEndDate(),
      start_hour: toSqlTime(shift.getStartHour()),
      end_hour: toSqlTime(shift.getEndHour()),
      start_minutes: shift.getStartMinutes(),
      end_minutes: shift.getEndMinutes(),
      // no weekday restriction is an empty array here, null in the domain
      weekdays: shift.getWeekdays() ?? [],
      notes: shift.getNotes(),
      created_by: shift.getCreatedBy(),
      created_by_email: shift.getCreatedByEmail(),
      updated_at: shift.getUpdatedAt(),
    };

    const staffIds = shift
      .getStaffMemberIds()
      .map((staffId) => staffId.toString());

    return this.prisma.$transaction(async (tx) => {
      const shiftId = id
        ? (await tx.shifts.update({ where: { id }, data })).id
        : (
            await tx.shifts.create({
              data: {
                ...data,
                tenant_id: shift.getTenantId().toString(),
                property_id: shift.getPropertyId().toString(),
                created_at: shift.getCreatedAt(),
              },
            })
          ).id;

      await tx.shift_staff_members.deleteMany({ where: { shift_id: shiftId } });
      if (staffIds.length > 0) {
        await tx.shift_staff_members.createMany({
          data: staffIds.map((userId) => ({
            shift_id: shiftId,
            user_id: userId,
          })),
        });
      }

      return shiftId;
    });
  }

  async delete(id: ShiftId): Promise<void> {
    await this.prisma.shifts.delete({ where: { id: id.toString() } });
  }

  async findById(id: ShiftId): Promise<Shift | null> {
    const row = await this.prisma.shifts.findUnique({
      where: { id: id.toString() },
      include: WITH_STAFF,
    });
    return row ? this.toDomain(row) : null;
  }

  async findByFilters(
    tenantId: TenantId,
    filters: ShiftFilters,
    visibleStaffMemberId?: UserId,
  ): Promise<Shift[]> {
    const where: Prisma.shiftsWhereInput = {
      tenant_id: tenantId.toString(),
      ...(filters.propertyId
        ? { property_id: filters.propertyId.toString() }
        : {}),
      ...(visibleStaffMemberId
        ? {
            shift_staff_members: {
              some: { user_id: visibleStaffMemberId.toString() },
            },
          }
        : {}),
      ...(filters.dateFrom || filters.dateTo
        ? overlapsWindow(
            filters.dateFrom ?? new Date('1970-01-01T00:00:00.000Z'),
            filters.dateTo ?? OPEN_ENDED_UPPER_BOUND,
          )
        : {}),
    };

    const rows = await this.prisma.shifts.findMany({
      where,
      include: WITH_STAFF,
      orderBy: [{ start_date: 'asc' }, { start_minutes: 'asc' }],
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findOverlappingByStaff(
    tenantId: TenantId,
    staffMemberId: UserId,
    shiftDate: Date,
    startMinutes: number,
    endMinutes: number,
    excludeShiftId?: ShiftId,
  ): Promise<Shift | null> {
    return this.findOverlappingByStaffInRange(
      tenantId,
      staffMemberId,
      shiftDate,
      shiftDate,
      startMinutes,
      endMinutes,
      excludeShiftId,
    );
  }

  async findOverlappingByStaffInRange(
    tenantId: TenantId,
    staffMemberId: UserId,
    startDate: Date,
    endDate: Date | null,
    startMinutes: number,
    endMinutes: number,
    excludeShiftId?: ShiftId,
    weekdays?: number[] | null,
  ): Promise<Shift | null> {
    const where: Prisma.shiftsWhereInput = {
      tenant_id: tenantId.toString(),
      shift_staff_members: { some: { user_id: staffMemberId.toString() } },
      ...overlapsWindow(startDate, endDate ?? OPEN_ENDED_UPPER_BOUND),
      // half-open interval overlap on the clock
      start_minutes: { lt: endMinutes },
      end_minutes: { gt: startMinutes },
      ...(excludeShiftId ? { id: { not: excludeShiftId.toString() } } : {}),
      ...(weekdays && weekdays.length > 0
        ? {
            // a shift with no weekday restriction runs every day, so it always clashes
            AND: [
              { OR: [{ weekdays: { isEmpty: true } }, { weekdays: { hasSome: weekdays } }] },
            ],
          }
        : {}),
    };

    const row = await this.prisma.shifts.findFirst({
      where,
      include: WITH_STAFF,
    });
    return row ? this.toDomain(row) : null;
  }

  private toDomain(row: ShiftRowWithStaff): Shift {
    return Shift.reconstitute({
      id: ShiftId.createFromString(row.id),
      tenantId: TenantId.createFromString(row.tenant_id),
      staffMemberIds: row.shift_staff_members.map((staff) =>
        UserId.createFromString(staff.user_id),
      ),
      propertyId: PropertyId.create(row.property_id),
      name: row.name,
      startDate: row.start_date,
      endDate: row.end_date,
      startHour: fromSqlTime(row.start_hour),
      endHour: fromSqlTime(row.end_hour),
      startMinutes: row.start_minutes,
      endMinutes: row.end_minutes,
      weekdays: row.weekdays.length > 0 ? row.weekdays : null,
      notes: row.notes,
      createdBy: row.created_by,
      createdByEmail: row.created_by_email,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
