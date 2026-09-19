import { ForbiddenException, Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  SHIFT_REPOSITORY,
  type ShiftRepository,
} from '@/domain/shift/repositories/shift.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { UserId } from '@/domain/user/entities/user.entity';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { GetShiftsQuery } from './get-shifts.query';
import type { GetShiftsResult } from './get-shifts.result';

@QueryHandler(GetShiftsQuery)
export class GetShiftsHandler implements IQueryHandler<
  GetShiftsQuery,
  GetShiftsResult
> {
  constructor(
    @Inject(SHIFT_REPOSITORY)
    private readonly shiftRepository: ShiftRepository,
  ) {}

  async execute(query: GetShiftsQuery): Promise<GetShiftsResult> {
    const tenantId = TenantId.createFromString(query.tenantId);
    const visibleStaffMemberId = this.resolveVisibleStaffMemberId(query);

    const shifts = await this.shiftRepository.findByFilters(
      tenantId,
      {
        dateFrom: query.filters.dateFrom,
        dateTo: query.filters.dateTo,
        propertyId: query.filters.propertyId
          ? PropertyId.create(query.filters.propertyId)
          : undefined,
      },
      visibleStaffMemberId,
    );

    return {
      items: shifts.map((shift) => ({
        id: shift.getId()!.toString(),
        tenantId: shift.getTenantId().toString(),
        staffMemberIds: shift
          .getStaffMemberIds()
          .map((staffMemberId) => staffMemberId.toString()),
        propertyId: shift.getPropertyId().toString(),
        name: shift.getName(),
        startDate: shift.getStartDate().toISOString(),
        endDate: shift.getEndDate() ? shift.getEndDate()!.toISOString() : null,
        startHour: shift.getStartHour(),
        endHour: shift.getEndHour(),
        startMinutes: shift.getStartMinutes(),
        endMinutes: shift.getEndMinutes(),
        weekdays: shift.getWeekdays(),
        notes: shift.getNotes(),
        createdBy: shift.getCreatedBy(),
        createdByEmail: shift.getCreatedByEmail(),
        createdAt: shift.getCreatedAt().toISOString(),
        updatedAt: shift.getUpdatedAt().toISOString(),
      })),
    };
  }

  private resolveVisibleStaffMemberId(
    query: GetShiftsQuery,
  ): UserId | undefined {
    if (!query.staffMemberId) {
      return query.canViewAllStaff
        ? undefined
        : UserId.createFromString(query.actorUserId);
    }

    if (!query.canViewAllStaff && query.staffMemberId !== query.actorUserId) {
      throw new ForbiddenException('You can only view your own shifts');
    }

    return UserId.createFromString(query.staffMemberId);
  }
}
