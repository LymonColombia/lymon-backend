import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { SaveGuestPreferencesCommand } from './save-guest-preferences.command';
import { SaveGuestPreferencesResult } from './save-guest-preferences.result';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import type { GuestRepository } from '@/domain/guest/repositories/guest.repository';
import { GUEST_REPOSITORY } from '@/domain/guest/repositories/guest.repository';
import { PlanTypeEnum } from '@/domain/tenant/value-objects/plan-type.vo';
import { CatalogPreferenceBuilderService } from '@/application/guest-preference/services/catalog-preference-builder.service';
import {
  AUDIT_LOG_EVENT,
  AuditLoggedEvent,
} from '@/infrastructure/audit/events/audit-logged.event';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';

const PLANS_WITH_PREFERENCES_ACCESS = new Set<string>([
  PlanTypeEnum.LYMON_PLUS,
  PlanTypeEnum.LYMON_PRIME,
]);

@CommandHandler(SaveGuestPreferencesCommand)
export class SaveGuestPreferencesHandler implements ICommandHandler<
  SaveGuestPreferencesCommand,
  SaveGuestPreferencesResult
> {
  constructor(
    @Inject(GUEST_REPOSITORY)
    private readonly repository: GuestRepository,
    private readonly catalogPreferenceBuilder: CatalogPreferenceBuilderService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    command: SaveGuestPreferencesCommand,
  ): Promise<SaveGuestPreferencesResult> {
    const { tenantId, guestId, catalogItemIds, activePlan } = command;

    this.validatePlanAccess(activePlan);

    const guest = await this.repository.findById(
      GuestId.createFromString(guestId),
    );

    if (!guest) {
      throw new NotFoundException(`Guest with ID ${guestId} not found`);
    }

    if (guest.getTenantId().toString() !== tenantId) {
      throw new ForbiddenException(
        'You do not have permission to modify this guest',
      );
    }

    const preferences = await this.catalogPreferenceBuilder.build(
      tenantId,
      catalogItemIds,
    );

    const wasCreated = guest.getPreferences().length === 0;

    guest.setPreferences(preferences);
    await this.repository.save(guest);

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId,
        command.actorId,
        command.actorEmail,
        AuditAction.GUEST_PREFERENCES_SAVED,
        AuditEntityType.GUEST,
        command.guestId,
      ),
    );

    return new SaveGuestPreferencesResult(guestId, wasCreated);
  }

  private validatePlanAccess(activePlan: string): void {
    if (!PLANS_WITH_PREFERENCES_ACCESS.has(activePlan)) {
      throw new ForbiddenException(
        'Guest preferences management requires a LYMON_PLUS or LYMON_PRIME plan. Please upgrade your plan.',
      );
    }
  }
}
