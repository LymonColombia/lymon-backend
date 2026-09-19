export enum ExperienceAvailabilityTypeEnum {
  RECURRING = 'RECURRING',
}

export class ExperienceAvailabilityType {
  private constructor(private readonly value: ExperienceAvailabilityTypeEnum) {}

  static create(value: string): ExperienceAvailabilityType {
    if (
      !Object.values(ExperienceAvailabilityTypeEnum).includes(
        value as ExperienceAvailabilityTypeEnum,
      )
    ) {
      throw new Error('Invalid availability type');
    }

    return new ExperienceAvailabilityType(
      value as ExperienceAvailabilityTypeEnum,
    );
  }

  isRecurring(): boolean {
    return this.value === ExperienceAvailabilityTypeEnum.RECURRING;
  }

  isOneTime(): boolean {
    return false;
  }

  isDateRange(): boolean {
    return false;
  }

  toString(): string {
    return this.value;
  }
}
