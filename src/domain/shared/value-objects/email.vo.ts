import { validate } from 'email-validator';
import { DomainException } from '@/domain/shared/exceptions/domain.exception';

export class Email {
  private constructor(private readonly value: string) {}

  static create(email: string): Email {
    const normalized = email.toLowerCase().trim();
    if (!this.isValid(normalized)) {
      throw new DomainException('Invalid email format');
    }
    return new Email(normalized);
  }

  static createFromString(email: string): Email {
    return this.create(email);
  }

  private static isValid(email: string): boolean {
    return validate(email);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    if (!other) {
      return false;
    }
    return this.value === other.value;
  }
}
