export enum PlanTypeEnum {
  LYMON_ONE = 'LYMON_ONE',
  LYMON_PLUS = 'LYMON_PLUS',
  LYMON_PRIME = 'LYMON_PRIME',
  TRIAL = 'TRIAL',
}

export class PlanType {
  private readonly value: PlanTypeEnum;

  private constructor(value: PlanTypeEnum) {
    this.value = value;
  }

  static create(value: string): PlanType {
    if (!Object.values(PlanTypeEnum).includes(value as PlanTypeEnum)) {
      throw new Error(`Invalid plan type ${value}`);
    }
    return new PlanType(value as PlanTypeEnum);
  }

  static createFromString(value: string): PlanType {
    return this.create(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: PlanType): boolean {
    return this.value === other.value;
  }

  isTrial(): boolean {
    return this.value === PlanTypeEnum.TRIAL;
  }

  getSiteLimit(): number {
    switch (this.value) {
      case PlanTypeEnum.TRIAL:
        return 2;
      case PlanTypeEnum.LYMON_ONE:
        return 5;
      case PlanTypeEnum.LYMON_PLUS:
        return 20;
      case PlanTypeEnum.LYMON_PRIME:
        return Number.MAX_SAFE_INTEGER;
      default:
        return 0;
    }
  }

  getStaffLimit(): number {
    switch (this.value) {
      case PlanTypeEnum.TRIAL:
        return 0;
      case PlanTypeEnum.LYMON_ONE:
        return 2;
      case PlanTypeEnum.LYMON_PLUS:
        return 10;
      case PlanTypeEnum.LYMON_PRIME:
        return Number.MAX_SAFE_INTEGER;
      default:
        return 0;
    }
  }
}
