export class ExperiencePurchaseId {
  private constructor(private readonly value: string) {}

  static createFromString(value: string): ExperiencePurchaseId {
    if (!value || value.trim() === '') {
      throw new Error('ExperiencePurchaseId cannot be empty');
    }
    return new ExperiencePurchaseId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: ExperiencePurchaseId): boolean {
    return this.value === other.value;
  }
}
