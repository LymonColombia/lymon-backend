export enum ReservationStatusEnum {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

const TRANSITIONS: Record<ReservationStatusEnum, ReservationStatusEnum[]> = {
  [ReservationStatusEnum.PENDING]: [
    ReservationStatusEnum.CONFIRMED,
    ReservationStatusEnum.CANCELLED,
  ],
  [ReservationStatusEnum.CONFIRMED]: [
    ReservationStatusEnum.CHECKED_IN,
    ReservationStatusEnum.CANCELLED,
    ReservationStatusEnum.NO_SHOW,
  ],
  [ReservationStatusEnum.CHECKED_IN]: [
    ReservationStatusEnum.CHECKED_OUT,
    ReservationStatusEnum.CANCELLED,
  ],
  [ReservationStatusEnum.CHECKED_OUT]: [],
  [ReservationStatusEnum.CANCELLED]: [],
  [ReservationStatusEnum.NO_SHOW]: [],
};

export class ReservationStatus {
  private constructor(private readonly value: ReservationStatusEnum) {}

  static create(value: ReservationStatusEnum): ReservationStatus {
    return new ReservationStatus(value);
  }

  getValue(): ReservationStatusEnum {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  canTransitionTo(next: ReservationStatusEnum): boolean {
    return TRANSITIONS[this.value].includes(next);
  }

  isPending(): boolean {
    return this.value === ReservationStatusEnum.PENDING;
  }
}
