export class UnitRatingId {
  private constructor(private readonly value: string) {}

  static create(value: string): UnitRatingId {
    if (!value || value.trim() === '') {
      throw new Error('UnitRatingId cannot be empty');
    }
    return new UnitRatingId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: UnitRatingId): boolean {
    return this.value === other.value;
  }
}
