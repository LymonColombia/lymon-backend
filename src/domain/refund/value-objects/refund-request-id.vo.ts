export class RefundRequestId {
  private constructor(private readonly value: string) {}

  static createFromString(value: string): RefundRequestId {
    if (!value || value.trim() === '') {
      throw new Error('RefundRequestId cannot be empty');
    }
    return new RefundRequestId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: RefundRequestId): boolean {
    return this.value === other.value;
  }
}
