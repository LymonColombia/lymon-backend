export class GuestTagId {
  private constructor(private readonly value: string) {}

  static createFromString(value: string): GuestTagId {
    if (!value || value.trim() === '') {
      throw new Error('GuestTagId cannot be empty');
    }
    return new GuestTagId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: GuestTagId): boolean {
    return this.value === other.value;
  }
}
