import { DomainException } from '@/domain/shared/exceptions/domain.exception';
import { Experience } from '@/domain/experience/entities/experience.entity';

export class ExperienceCapacityChecker {
  static check(
    experience: Experience,
    requestedQuantity: number,
    alreadyConfirmedCount: number,
  ): void {
    const available = experience.getCapacity() - alreadyConfirmedCount;
    if (requestedQuantity > available) {
      throw new DomainException(
        `Experience '${experience.getName()}' does not have enough capacity. Available: ${available}, requested: ${requestedQuantity}`,
      );
    }
  }
}
