import { GuestStatusEnum } from '@/domain/guest/entities/guest.types';
import { GuestLifecycleStatus } from '@/domain/guest/value-objects/guest-lifecycle-status.vo';
import { GuestPreferenceItem } from '@/domain/guest/value-objects/guest-preference-item.vo';

export interface GuestDto {
  id: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  primaryEmail: string;
  phone: string | null;
  status: GuestStatusEnum;
  tags: string[];
  preferences: GuestPreferenceItem[];
  summary: {
    totalBookings: number;
    totalNights: number;
    totalSpend: number;
    lastStayAt: Date | null;
    lastPropertyId: string | null;
    lastUnitId: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  lifecycleStatus: GuestLifecycleStatus;
}

export interface GetGuestByIdResult {
  item: GuestDto | null;
}
