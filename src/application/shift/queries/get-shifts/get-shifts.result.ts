export interface ShiftListItemDto {
  id: string;
  tenantId: string;
  staffMemberIds: string[];
  propertyId: string;
  name: string;
  startDate: string;
  endDate: string | null;
  startHour: string;
  endHour: string;
  startMinutes: number;
  endMinutes: number;
  weekdays: number[] | null;
  notes: string | null;
  createdBy: string | null;
  createdByEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetShiftsResult {
  items: ShiftListItemDto[];
}
