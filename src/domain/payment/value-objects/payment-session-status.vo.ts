export enum PaymentSessionStatusEnum {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

const TRANSITIONS: Record<
  PaymentSessionStatusEnum,
  PaymentSessionStatusEnum[]
> = {
  [PaymentSessionStatusEnum.PENDING]: [
    PaymentSessionStatusEnum.APPROVED,
    PaymentSessionStatusEnum.DECLINED,
    PaymentSessionStatusEnum.EXPIRED,
    PaymentSessionStatusEnum.CANCELLED,
  ],
  [PaymentSessionStatusEnum.APPROVED]: [],
  [PaymentSessionStatusEnum.DECLINED]: [],
  [PaymentSessionStatusEnum.EXPIRED]: [],
  [PaymentSessionStatusEnum.CANCELLED]: [],
};

export class PaymentSessionStatus {
  private constructor(private readonly value: PaymentSessionStatusEnum) {}

  static create(value: PaymentSessionStatusEnum): PaymentSessionStatus {
    return new PaymentSessionStatus(value);
  }

  static pending(): PaymentSessionStatus {
    return new PaymentSessionStatus(PaymentSessionStatusEnum.PENDING);
  }

  getValue(): PaymentSessionStatusEnum {
    return this.value;
  }

  canTransitionTo(next: PaymentSessionStatusEnum): boolean {
    return TRANSITIONS[this.value].includes(next);
  }

  isPending(): boolean {
    return this.value === PaymentSessionStatusEnum.PENDING;
  }

  isTerminal(): boolean {
    return [
      PaymentSessionStatusEnum.APPROVED,
      PaymentSessionStatusEnum.DECLINED,
      PaymentSessionStatusEnum.EXPIRED,
      PaymentSessionStatusEnum.CANCELLED,
    ].includes(this.value);
  }

  toString(): string {
    return this.value;
  }
}
