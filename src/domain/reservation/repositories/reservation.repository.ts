import { Reservation } from '../entities/reservation.entity';
import { ReservationId } from '../value-objects/reservation-id.vo';
import { DateRange } from '../value-objects/date-range.vo';
import { ReservationSourceEnum } from '../value-objects/reservation-source.vo';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { TransactionContextData } from '@/domain/shared/transaction-manager.interface';

export const RESERVATION_REPOSITORY = 'RESERVATION_REPOSITORY';
export interface ReservationRepository {
  save(reservation: Reservation, ctx?: TransactionContextData): Promise<string>;
  findById(id: ReservationId): Promise<Reservation | null>;
  findByTenantId(
    tenantId: string,
    page: number,
    limit: number,
  ): Promise<Reservation[]>;
  findByPropertyId(
    tenantId: string,
    propertyId: string,
    page: number,
    limit: number,
  ): Promise<Reservation[]>;
  findByUnitId(
    tenantId: string,
    unitId: string,
    page: number,
    limit: number,
  ): Promise<Reservation[]>;
  findByGuestId(
    tenantId: string,
    guestId: string,
    page: number,
    limit: number,
    sortBy?: 'checkIn' | 'createdAt',
    sortDirection?: 'asc' | 'desc',
  ): Promise<Reservation[]>;
  countByGuestId(tenantId: string, guestId: string): Promise<number>;
  countByGuestIdGroupedBySource(
    tenantId: string,
    guestId: string,
  ): Promise<Array<{ source: string; count: number }>>;
  findByUnitAndDateRange(
    unitId: UnitId,
    dateRange: DateRange,
  ): Promise<Reservation[]>;
  findActiveByUnitFromDate(
    unitId: UnitId,
    fromDate: Date,
  ): Promise<Reservation[]>;
  findByExternalId(
    source: ReservationSourceEnum,
    externalId: string,
  ): Promise<Reservation | null>;
  existsActiveByPropertyId(
    tenantId: string,
    propertyId: string,
  ): Promise<boolean>;
  existsActiveByUnitId(tenantId: string, unitId: string): Promise<boolean>;
  countByTenantId(tenantId: string): Promise<number>;
  existsActiveByPropertyId(
    tenantId: string,
    propertyId: string,
  ): Promise<boolean>;
  findConfirmedDueForCheckIn(date: Date): Promise<Reservation[]>;
  getMonthlySpendingByGuestId(
    tenantId: string,
    guestId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<{ year: number; month: number; totalSpend: number }[]>;
  getLastStayAt(tenantId: string, guestId: string): Promise<Date | null>;
}
