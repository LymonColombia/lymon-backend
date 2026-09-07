import { randomUUID } from 'node:crypto';

export class GuestEmailId {
  private constructor(private readonly value: string) {}

  static create(): GuestEmailId {
    return new GuestEmailId(randomUUID());
  }

  static createFromString(value: string): GuestEmailId {
    if (!value || value.trim() === '') {
      throw new Error('GuestEmailId cannot be empty');
    }
    return new GuestEmailId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: GuestEmailId): boolean {
    return this.value === other.value;
  }
}
