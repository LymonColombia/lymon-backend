import { uuidv7 } from '@/domain/shared/value-objects/uuid.util';

export class ConversationId {
  private constructor(private readonly value: string) {}

  static create(): ConversationId {
    return new ConversationId(uuidv7());
  }

  static createFromString(value: string): ConversationId {
    if (!value || value.trim() === '') {
      throw new Error('ConversationId cannot be empty');
    }
    return new ConversationId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: ConversationId): boolean {
    return this.value === other.value;
  }
}
