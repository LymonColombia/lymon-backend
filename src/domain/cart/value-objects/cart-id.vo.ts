export class CartId {
  private constructor(private readonly value: string) {}

  static createFromString(value: string): CartId {
    if (!value || value.trim() === '') {
      throw new Error('CartId cannot be empty');
    }
    return new CartId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: CartId): boolean {
    return this.value === other.value;
  }
}
