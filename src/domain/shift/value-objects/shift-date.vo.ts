import { BadRequestException } from '@nestjs/common';

/**
 * ShiftDate Value Object
 * Represents a date in YYYY-MM-DD format
 */
export class ShiftDate {
  private readonly date: Date;

  private constructor(date: Date) {
    this.date = date;
  }

  /**
   * Parse a date string in YYYY-MM-DD format
   * @param value Date string (e.g., "2024-01-15")
   * @returns ShiftDate instance
   * @throws BadRequestException if format is invalid
   */
  static fromString(value: string): ShiftDate {
    const shiftDate = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(shiftDate.getTime())) {
      throw new BadRequestException('Invalid shift date');
    }
    return new ShiftDate(shiftDate);
  }

  /**
   * Create ShiftDate from a Date object
   */
  static fromDate(date: Date): ShiftDate {
    return new ShiftDate(date);
  }

  /**
   * Get the underlying Date object
   */
  getDate(): Date {
    return new Date(this.date);
  }

  /**
   * Get the string representation in YYYY-MM-DD format
   */
  toString(): string {
    return this.date.toISOString().slice(0, 10);
  }

  /**
   * Check if this date is after another date (ignoring time)
   */
  isAfter(other: ShiftDate | Date): boolean {
    const otherDate = other instanceof ShiftDate ? other.date : other;
    return (
      this.date.toISOString().slice(0, 10) >
      otherDate.toISOString().slice(0, 10)
    );
  }

  /**
   * Check if this date is before another date (ignoring time)
   */
  isBefore(other: ShiftDate | Date): boolean {
    const otherDate = other instanceof ShiftDate ? other.date : other;
    return (
      this.date.toISOString().slice(0, 10) <
      otherDate.toISOString().slice(0, 10)
    );
  }

  /**
   * Check if this date is equal to another date (ignoring time)
   */
  equals(other: ShiftDate | Date | null | undefined): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    const otherDate = this.extractDate(other);
    if (!otherDate) {
      return false;
    }
    return (
      this.date.toISOString().slice(0, 10) ===
      otherDate.toISOString().slice(0, 10)
    );
  }

  private extractDate(other: ShiftDate | Date): Date | null {
    if (other instanceof ShiftDate) {
      return other.date;
    }
    if (other instanceof Date) {
      return other;
    }
    return null;
  }
}
