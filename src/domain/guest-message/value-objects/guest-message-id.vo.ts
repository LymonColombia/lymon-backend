import { randomUUID } from 'node:crypto';

export class GuestMessageId {
  private constructor(private readonly value: string) {}

  static create(): GuestMessageId {
    return new GuestMessageId(randomUUID());
  }

  static createFromString(value: string): GuestMessageId {
    if (!value || value.trim() === '') {
      throw new Error('GuestMessageId cannot be empty');
    }
    return new GuestMessageId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: GuestMessageId): boolean {
    return this.value === other.value;
  }
}
