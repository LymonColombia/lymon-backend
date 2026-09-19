export class SupplierId {
  private constructor(private readonly value: string) {}

  static create(value: string): SupplierId {
    if (!value || value.trim() === '') {
      throw new Error('SupplierId cannot be empty');
    }
    return new SupplierId(value);
  }

  toString(): string {
    return this.value;
  }
}
