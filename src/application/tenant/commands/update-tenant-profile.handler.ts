import { UpdateTenantProfileCommand } from '@/application/tenant/commands/update-tenant-profile.command';
import { UpdateTenantProfileResult } from '@/application/tenant/commands/update-tenant-profile.result';
import {
  TENANT_REPOSITORY,
  type TenantRepository,
} from '@/domain/tenant/repositories/tenant.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import {
  AuditLoggedEvent,
  AUDIT_LOG_EVENT,
} from '@/infrastructure/audit/events/audit-logged.event';
import {
  BadRequestException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { tenantLogoPrefix } from '@/application/tenant/logo/tenant-logo-key';
import {
  R2StorageService,
  R2_STORAGE_SERVICE,
} from '@/infrastructure/storage/r2-storage.service';

@CommandHandler(UpdateTenantProfileCommand)
export class UpdateTenantProfileHandler implements ICommandHandler<UpdateTenantProfileCommand> {
  constructor(
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: TenantRepository,
    @Inject(R2_STORAGE_SERVICE)
    private readonly storageService: R2StorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    command: UpdateTenantProfileCommand,
  ): Promise<UpdateTenantProfileResult> {
    // A provided logo key must live under this tenant's own prefix so a tenant
    // can't claim someone else's (or an arbitrary) object.
    if (
      command.logoKey != null &&
      !command.logoKey.startsWith(tenantLogoPrefix(command.tenantId))
    ) {
      throw new BadRequestException('Invalid logo key');
    }

    const tenant = await this.tenantRepository.findById(
      TenantId.createFromString(command.tenantId),
    );

    if (!tenant) {
      throw new NotFoundException(`Tenant not found`);
    }

    const oldLogoKey = tenant.getLogoKey();

    tenant.updateProfile(
      command.name,
      command.contactPhone,
      command.address,
      command.description,
      command.theme,
      command.logoKey,
    );

    await this.tenantRepository.save(tenant);

    // Best-effort: remove the replaced logo once the new key is committed.
    if (
      command.logoKey !== undefined &&
      oldLogoKey &&
      oldLogoKey !== command.logoKey
    ) {
      await this.storageService.deleteObjects([oldLogoKey]);
    }

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId,
        command.actorId,
        command.actorEmail,
        AuditAction.TENANT_PROFILE_UPDATED,
        AuditEntityType.TENANT,
        command.tenantId,
        {
          name: command.name,
          contactPhone: command.contactPhone,
          address: command.address,
          description: command.description,
          theme: command.theme,
          logoKey: command.logoKey,
        },
      ),
    );

    return new UpdateTenantProfileResult(command.tenantId);
  }
}
