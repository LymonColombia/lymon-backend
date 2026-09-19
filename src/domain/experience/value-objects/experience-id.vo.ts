export class ExperienceId {
  private constructor(private readonly value: string) {}

  static create(value: string): ExperienceId {
    if (!value || value.trim() === '') {
      throw new Error('ExperienceId cannot be empty');
    }

    return new ExperienceId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: ExperienceId): boolean {
    return this.value === other.value;
  }
}
