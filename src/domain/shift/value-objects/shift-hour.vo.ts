import { BadRequestException } from '@nestjs/common';

/**
 * ShiftHour Value Object
 * Represents a 24-hour time in HH:mm format
 */
export class ShiftHour {
  private readonly hour: number;
  private readonly minute: number;

  private constructor(hour: number, minute: number) {
    this.hour = hour;
    this.minute = minute;
  }

  /**
   * Parse a time string in HH:mm format
   * @param value Time string (e.g., "09:30")
   * @returns ShiftHour instance
   * @throws BadRequestException if format is invalid
   */
  static fromString(value: string): ShiftHour {
    const [hoursRaw, minutesRaw] = value.split(':');
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new BadRequestException('Invalid shift time format');
    }

    return new ShiftHour(hours, minutes);
  }

  /**
   * Convert time to minutes since midnight
   */
  toMinutes(): number {
    return this.hour * 60 + this.minute;
  }

  /**
   * Get the string representation in HH:mm format
   */
  toString(): string {
    return `${String(this.hour).padStart(2, '0')}:${String(this.minute).padStart(2, '0')}`;
  }

  /**
   * Get the hour value
   */
  getHour(): number {
    return this.hour;
  }

  /**
   * Get the minute value
   */
  getMinute(): number {
    return this.minute;
  }

  /**
   * Check equality with another ShiftHour
   */
  equals(other: unknown): boolean {
    if (!(other instanceof ShiftHour)) {
      return false;
    }
    return this.hour === other.hour && this.minute === other.minute;
  }
}
