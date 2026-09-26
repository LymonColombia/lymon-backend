export enum RefundRequestStatusEnum {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
}

export class RefundRequestStatus {
  private constructor(private readonly value: RefundRequestStatusEnum) {}

  static create(value: string): RefundRequestStatus {
    if (
      !Object.values(RefundRequestStatusEnum).includes(
        value as RefundRequestStatusEnum,
      )
    ) {
      throw new Error(`Invalid refund request status: ${value}`);
    }
    return new RefundRequestStatus(value as RefundRequestStatusEnum);
  }

  static pending(): RefundRequestStatus {
    return new RefundRequestStatus(RefundRequestStatusEnum.PENDING);
  }

  isPending(): boolean {
    return this.value === RefundRequestStatusEnum.PENDING;
  }

  isApproved(): boolean {
    return this.value === RefundRequestStatusEnum.APPROVED;
  }

  isDenied(): boolean {
    return this.value === RefundRequestStatusEnum.DENIED;
  }

  canTransitionTo(next: RefundRequestStatusEnum): boolean {
    return (
      this.value === RefundRequestStatusEnum.PENDING &&
      (next === RefundRequestStatusEnum.APPROVED ||
        next === RefundRequestStatusEnum.DENIED)
    );
  }

  toString(): string {
    return this.value;
  }

  equals(other: RefundRequestStatus): boolean {
    return this.value === other.value;
  }
}
