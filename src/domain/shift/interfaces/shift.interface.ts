import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { UserId } from '@/domain/user/entities/user.entity';
import { ShiftId } from '@/domain/shift/value-objects/shift-id.vo';

export interface IShiftReconstituteData {
  id: ShiftId;
  tenantId: TenantId;
  staffMemberIds: UserId[];
  propertyId: PropertyId;
  name: string;
  startDate: Date;
  endDate: Date | null;
  startHour: string;
  endHour: string;
  startMinutes: number;
  endMinutes: number;
  weekdays: number[] | null;
  notes: string | null;
  createdBy: string | null;
  createdByEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
}
