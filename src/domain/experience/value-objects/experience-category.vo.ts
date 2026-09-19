export enum ExperienceCategoryEnum {
  TRANSPORTATION = 'TRANSPORTATION',
}

export class ExperienceCategory {
  private constructor(private readonly value: ExperienceCategoryEnum) {}

  static create(value: string): ExperienceCategory {
    if (
      !Object.values(ExperienceCategoryEnum).includes(
        value as ExperienceCategoryEnum,
      )
    ) {
      throw new Error('Invalid experience category');
    }

    return new ExperienceCategory(value as ExperienceCategoryEnum);
  }

  toString(): string {
    return this.value;
  }
}
