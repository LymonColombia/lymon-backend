import { randomUUID } from 'node:crypto';

export class ConversationId {
  private constructor(private readonly value: string) {}

  static create(): ConversationId {
    return new ConversationId(randomUUID());
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
