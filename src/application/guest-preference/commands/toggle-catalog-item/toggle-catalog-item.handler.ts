import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ToggleCatalogItemCommand } from './toggle-catalog-item.command';
import {
  GUEST_PREFERENCE_CATALOG_REPOSITORY,
  type GuestPreferenceCatalogRepository,
} from '@/domain/guest-preference/repositories/guest-preference-catalog.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import {
  AUDIT_LOG_EVENT,
  AuditLoggedEvent,
} from '@/infrastructure/audit/events/audit-logged.event';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';

@CommandHandler(ToggleCatalogItemCommand)
export class ToggleCatalogItemHandler implements ICommandHandler<
  ToggleCatalogItemCommand,
  void
> {
  constructor(
    @Inject(GUEST_PREFERENCE_CATALOG_REPOSITORY)
    private readonly repository: GuestPreferenceCatalogRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: ToggleCatalogItemCommand): Promise<void> {
    const tenantId = TenantId.createFromString(command.tenantId);

    const item = await this.repository.findById(command.itemId);

    if (item?.getTenantId().toString() !== tenantId.toString()) {
      throw new NotFoundException('Catalog item not found');
    }

    if (command.activate) {
      item.activate();
    } else {
      item.deactivate();
    }

    await this.repository.save(item);

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId,
        command.actorId,
        command.actorEmail,
        AuditAction.GUEST_CATALOG_ITEM_TOGGLED,
        AuditEntityType.GUEST_CATALOG_ITEM,
        command.itemId,
      ),
    );
  }
}
