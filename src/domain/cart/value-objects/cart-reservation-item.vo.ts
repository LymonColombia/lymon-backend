export class CartReservationItem {
  private constructor(
    readonly tenantId: string,
    readonly propertyId: string,
    readonly unitId: string,
    readonly checkIn: Date,
    readonly checkOut: Date,
    readonly guestsCount: number,
    readonly notes: string | null,
    readonly pricePerNight: number,
    readonly totalPriceCopSnapshot: number,
    readonly reservationId: string | null,
  ) {}

  static create(params: {
    tenantId: string;
    propertyId: string;
    unitId: string;
    checkIn: Date;
    checkOut: Date;
    guestsCount: number;
    notes: string | null;
    pricePerNight: number;
    totalPriceCopSnapshot: number;
    reservationId?: string | null;
  }): CartReservationItem {
    return new CartReservationItem(
      params.tenantId,
      params.propertyId,
      params.unitId,
      params.checkIn,
      params.checkOut,
      params.guestsCount,
      params.notes,
      params.pricePerNight,
      params.totalPriceCopSnapshot,
      params.reservationId ?? null,
    );
  }

  withReservationId(reservationId: string): CartReservationItem {
    return new CartReservationItem(
      this.tenantId,
      this.propertyId,
      this.unitId,
      this.checkIn,
      this.checkOut,
      this.guestsCount,
      this.notes,
      this.pricePerNight,
      this.totalPriceCopSnapshot,
      reservationId,
    );
  }
}
