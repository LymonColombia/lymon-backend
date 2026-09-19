export class GuestNoteId {
  private constructor(private readonly value: string) {}

  static createFromString(value: string): GuestNoteId {
    if (!value || value.trim() === '') {
      throw new Error('GuestNoteId cannot be empty');
    }
    return new GuestNoteId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: GuestNoteId): boolean {
    return this.value === other.value;
  }
}
