export enum ExperienceStatusEnum {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export class ExperienceStatus {
  private constructor(private readonly value: ExperienceStatusEnum) {}

  static create(value: string): ExperienceStatus {
    if (
      !Object.values(ExperienceStatusEnum).includes(
        value as ExperienceStatusEnum,
      )
    ) {
      throw new Error('Invalid experience status');
    }

    return new ExperienceStatus(value as ExperienceStatusEnum);
  }

  static active(): ExperienceStatus {
    return new ExperienceStatus(ExperienceStatusEnum.ACTIVE);
  }

  toString(): string {
    return this.value;
  }
}
