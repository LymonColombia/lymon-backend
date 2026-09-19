export enum CartStatusEnum {
  OPEN = 'OPEN',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
}

export class CartStatus {
  private constructor(private readonly value: CartStatusEnum) {}

  static create(value: CartStatusEnum): CartStatus {
    return new CartStatus(value);
  }

  static open(): CartStatus {
    return new CartStatus(CartStatusEnum.OPEN);
  }

  getValue(): CartStatusEnum {
    return this.value;
  }

  isOpen(): boolean {
    return this.value === CartStatusEnum.OPEN;
  }

  isPendingPayment(): boolean {
    return this.value === CartStatusEnum.PENDING_PAYMENT;
  }

  isPaid(): boolean {
    return this.value === CartStatusEnum.PAID;
  }

  toString(): string {
    return this.value;
  }
}
