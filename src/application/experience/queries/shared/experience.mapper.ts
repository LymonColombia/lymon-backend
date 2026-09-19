import { Experience } from '@/domain/experience/entities/experience.entity';
import {
  PublicExperienceDto,
  PublicExperienceRecurrenceDto,
} from '@/application/experience/queries/shared/experience-read.dto';
import { ExperienceScopeEnum } from '@/domain/experience/value-objects/experience-scope.vo';

export function mapExperienceToPublicDto(
  experience: Experience,
  getPublicUrl: (key: string) => string,
): PublicExperienceDto {
  const recurrence = experience.getRecurrence();
  const propertyId = experience.getPropertyId();

  return new PublicExperienceDto(
    experience.getId()!.toString(),
    experience.getTenantId().toString(),
    propertyId?.toString() ?? null,
    propertyId ? ExperienceScopeEnum.PROPERTY : ExperienceScopeEnum.GLOBAL,
    experience.getName(),
    experience.getDescription(),
    experience.getCity(),
    experience.getCategory().toString(),
    experience.getPriceCop(),
    experience.getMinimumParticipants(),
    experience.getCapacity(),
    experience.getAvailabilityType().toString(),
    recurrence
      ? new PublicExperienceRecurrenceDto(
          recurrence.daysOfWeek,
          recurrence.startTime,
          recurrence.endTime,
        )
      : null,
    experience.getAllowStandalonePurchase(),
    experience.getAllowReservationPurchase(),
    experience.getMinNoticeHours(),
    experience.getPurchaseCutoffHours(),
    experience.getStatus().toString(),
    experience.getMediaKeys().map(getPublicUrl),
  );
}
