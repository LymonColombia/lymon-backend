export interface RefundPolicyInfo {
  eligible: boolean;
  refundAmount: number;
  policy: string;
  daysBeforeCheckIn: number;
  refundRequestId: string | null;
}

import { TravelerInfo } from '@/domain/reservation/entities/reservation.entity';

export interface GuestReservationDetailResult {
  id: string;
  bookingReference: string;
  propertyId: string;
  propertyName: string | null;
  unitId: string;
  unitName: string | null;
  serviceName: string;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  status: string;
  guestsCount: number;
  notes: string | null;
  source: string;
  cancellationReason: string | null;
  cancelledAt: Date | null;
  checkInActualAt: Date | null;
  checkOutActualAt: Date | null;
  checkInInfo: TravelerInfo[];
  priceBreakdown: {
    pricePerNight: number;
    nights: number;
    totalPrice: number;
  };
  refundPolicy: RefundPolicyInfo;
  actions: {
    contactSupport: {
      enabled: true;
      channel: 'email';
    };
  };
}
