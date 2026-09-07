import { isUuid } from '@/domain/shared/value-objects/uuid.util';

export class GuestId {
  private constructor(private readonly value: string) {}

  static createFromString(value: string): GuestId {
    if (!value || value.trim() === '') {
      throw new Error('GuestId cannot be empty');
    }

    if (!isUuid(value)) {
      throw new Error('Invalid GuestId format');
    }

    return new GuestId(value);
  }

  toString(): string {
    return this.value;
  }
}
