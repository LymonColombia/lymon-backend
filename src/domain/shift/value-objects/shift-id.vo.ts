export class ShiftId {
  private constructor(private readonly value: string) {}

  static createFromString(value: string): ShiftId {
    if (!value || value.trim() === '') {
      throw new Error('ShiftId cannot be empty');
    }
    return new ShiftId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: ShiftId): boolean {
    return this.value === other.value;
  }
}
