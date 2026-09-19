import { BadRequestException } from '@nestjs/common';

export enum GuestLifecycleStatus {
  NO_RESERVATION = 'NO_RESERVATION',
  UPCOMING_STAY = 'UPCOMING_STAY',
  CHECKED_IN = 'CHECKED_IN',
  PAST_GUEST = 'PAST_GUEST',
}

export class GuestLifecycleStatusVO {
  private readonly value: GuestLifecycleStatus;

  private constructor(value: GuestLifecycleStatus) {
    this.value = value;
  }

  public static create(value: string): GuestLifecycleStatusVO {
    if (!Object.values(GuestLifecycleStatus).includes(value as GuestLifecycleStatus)) {
      throw new BadRequestException(`Invalid lifecycle status: ${value}`);
    }
    return new GuestLifecycleStatusVO(value as GuestLifecycleStatus);
  }

  public getValue(): GuestLifecycleStatus {
    return this.value;
  }

  public toString(): string {
    return this.value.toString();
  }

  public equals(other: GuestLifecycleStatusVO): boolean {
    return this.value === other.getValue();
  }
}