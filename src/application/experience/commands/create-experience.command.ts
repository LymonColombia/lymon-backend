import { ExperienceAvailabilityTypeEnum } from '@/domain/experience/value-objects/experience-availability-type.vo';
import { ExperienceCategoryEnum } from '@/domain/experience/value-objects/experience-category.vo';
import { ExperienceScopeEnum } from '@/domain/experience/value-objects/experience-scope.vo';

export interface CreateExperienceRecurrenceInput {
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
}

export class CreateExperienceCommand {
  constructor(
    public readonly tenantId: string,
    public readonly scope: ExperienceScopeEnum,
    public readonly propertyId: string | undefined,
    public readonly name: string,
    public readonly description: string,
    public readonly city: string,
    public readonly category: ExperienceCategoryEnum,
    public readonly priceCop: number,
    public readonly minimumParticipants: number | undefined,
    public readonly capacity: number,
    public readonly availabilityType: ExperienceAvailabilityTypeEnum,
    public readonly recurrence: CreateExperienceRecurrenceInput | undefined,
    public readonly allowStandalonePurchase: boolean,
    public readonly allowReservationPurchase: boolean,
    public readonly mediaKeys: string[] | undefined,
    public readonly actorId: string,
    public readonly actorEmail: string,
  ) {}
}
