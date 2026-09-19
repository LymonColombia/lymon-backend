export enum ExperienceScopeEnum {
  GLOBAL = 'GLOBAL',
  PROPERTY = 'PROPERTY',
}

export class ExperienceScope {
  private constructor(private readonly value: ExperienceScopeEnum) {}

  static create(value: string): ExperienceScope {
    if (
      !Object.values(ExperienceScopeEnum).includes(value as ExperienceScopeEnum)
    ) {
      throw new Error('Invalid experience scope');
    }

    return new ExperienceScope(value as ExperienceScopeEnum);
  }

  isPropertyScope(): boolean {
    return this.value === ExperienceScopeEnum.PROPERTY;
  }

  isGlobalScope(): boolean {
    return this.value === ExperienceScopeEnum.GLOBAL;
  }

  toString(): string {
    return this.value;
  }
}
