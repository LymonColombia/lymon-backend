export enum ReservationSourceEnum {
  MANUAL = 'MANUAL',
  DIRECT = 'DIRECT',
  AIRBNB = 'AIRBNB',
  BOOKING = 'BOOKING',
  VRBO = 'VRBO',
}

const EXTERNAL_SOURCES: Set<ReservationSourceEnum> = new Set([
  ReservationSourceEnum.AIRBNB,
  ReservationSourceEnum.BOOKING,
  ReservationSourceEnum.VRBO,
]);

export class ReservationSource {
  private constructor(private readonly value: ReservationSourceEnum) {}

  static create(value: ReservationSourceEnum): ReservationSource {
    return new ReservationSource(value);
  }

  getValue(): ReservationSourceEnum {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  isExternal(): boolean {
    return EXTERNAL_SOURCES.has(this.value);
  }
}
