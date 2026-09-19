export class PublicExperienceRecurrenceDto {
  constructor(
    public readonly daysOfWeek: number[],
    public readonly startTime: string,
    public readonly endTime: string,
  ) {}
}

export class ExperienceUnitSummaryDto {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly maxGuests: number,
    public readonly pricePerNight: number,
  ) {}
}

export class PublicExperienceDto {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly propertyId: string | null,
    public readonly scope: string,
    public readonly name: string,
    public readonly description: string,
    public readonly city: string,
    public readonly category: string,
    public readonly priceCop: number,
    public readonly minimumParticipants: number,
    public readonly capacity: number,
    public readonly availabilityType: string,
    public readonly recurrence: PublicExperienceRecurrenceDto | null,
    public readonly allowStandalonePurchase: boolean,
    public readonly allowReservationPurchase: boolean,
    public readonly minNoticeHours: number,
    public readonly purchaseCutoffHours: number,
    public readonly status: string,
    public readonly mediaUrls: string[],
  ) {}
}
