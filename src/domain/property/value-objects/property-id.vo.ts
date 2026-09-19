import { DomainException } from '@/domain/shared/exceptions/domain.exception';
import { isUuid } from '@/domain/shared/value-objects/uuid.util';

export class PropertyId {
  private constructor(private readonly value: string) {}

  static create(value: string): PropertyId {
    if (!value || value.trim() === '') {
      throw new DomainException('PropertyId cannot be empty');
    }
    if (!isUuid(value)) {
      throw new DomainException('PropertyId must be a valid uuid');
    }
    return new PropertyId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: PropertyId): boolean {
    return this.value === other.value;
  }
}
