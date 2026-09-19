import { DomainException } from '@/domain/shared/exceptions/domain.exception';

// ponytail: hardcoded Bogota; move to a per-property timezone if the app leaves Colombia
const PROPERTY_TIMEZONE = 'America/Bogota';

export class DateRange {
  private constructor(
    private readonly checkIn: Date,
    private readonly checkOut: Date,
  ) {}

  static create(checkIn: Date, checkOut: Date): DateRange {
    // "today" is the business date at the property, not the server's timezone.
    // en-CA formats as YYYY-MM-DD, which compares lexicographically.
    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: PROPERTY_TIMEZONE,
    });
    const checkInDay = checkIn.toISOString().slice(0, 10);
    if (checkInDay < today) {
      throw new DomainException('checkIn cannot be in the past');
    }
    if (checkOut <= checkIn) {
      throw new DomainException('checkOut must be after checkIn');
    }
    return new DateRange(checkIn, checkOut);
  }

  static reconstitute(checkIn: Date, checkOut: Date): DateRange {
    return new DateRange(checkIn, checkOut);
  }

  getCheckIn(): Date {
    return this.checkIn;
  }

  getCheckOut(): Date {
    return this.checkOut;
  }

  nights(): number {
    const ms = this.checkOut.getTime() - this.checkIn.getTime();
    return Math.round(ms / (1000 * 60 * 60 * 24));
  }

  overlaps(other: DateRange): boolean {
    return this.checkIn < other.checkOut && this.checkOut > other.checkIn;
  }
}
