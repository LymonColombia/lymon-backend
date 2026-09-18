import { Shift } from '@/domain/shift/entities/shift.entity';
import { ShiftId } from '@/domain/shift/value-objects/shift-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { UserId } from '@/domain/user/entities/user.entity';

export const SHIFT_REPOSITORY = 'SHIFT_REPOSITORY';

export interface ShiftFilters {
  dateFrom?: Date;
  dateTo?: Date;
  propertyId?: PropertyId;
}

/** The time window a shift occupies, checked against a staff member's other shifts. */
export interface ShiftWindow {
  startDate: Date;
  /** null = open-ended */
  endDate: Date | null;
  startMinutes: number;
  endMinutes: number;
  /** null/empty = every day */
  weekdays?: number[] | null;
}

export interface ShiftRepository {
  save(shift: Shift): Promise<string>;
  delete(id: ShiftId): Promise<void>;
  findById(id: ShiftId): Promise<Shift | null>;
  findByFilters(
    tenantId: TenantId,
    filters: ShiftFilters,
    visibleStaffMemberId?: UserId,
  ): Promise<Shift[]>;
  findOverlappingByStaffInRange(
    tenantId: TenantId,
    staffMemberId: UserId,
    window: ShiftWindow,
    excludeShiftId?: ShiftId,
  ): Promise<Shift | null>;
  findOverlappingByStaff(
    tenantId: TenantId,
    staffMemberId: UserId,
    shiftDate: Date,
    startMinutes: number,
    endMinutes: number,
    excludeShiftId?: ShiftId,
  ): Promise<Shift | null>;
}
