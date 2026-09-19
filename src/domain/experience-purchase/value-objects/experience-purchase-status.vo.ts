export enum ExperiencePurchaseStatusEnum {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export class ExperiencePurchaseStatus {
  private constructor(private readonly value: ExperiencePurchaseStatusEnum) {}

  static create(value: ExperiencePurchaseStatusEnum): ExperiencePurchaseStatus {
    return new ExperiencePurchaseStatus(value);
  }

  static pending(): ExperiencePurchaseStatus {
    return new ExperiencePurchaseStatus(ExperiencePurchaseStatusEnum.PENDING);
  }

  getValue(): ExperiencePurchaseStatusEnum {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}
