import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteTenantCommand } from './delete-tenant.command';
import { Inject, NotFoundException } from '@nestjs/common';
import {
  type TenantRepository,
  TENANT_REPOSITORY,
} from '@/domain/tenant/repositories/tenant.repository';
import {
  type UserRepository,
  USER_REPOSITORY,
} from '@/domain/user/repositories/user.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

@CommandHandler(DeleteTenantCommand)
export class DeleteTenantHandler implements ICommandHandler<DeleteTenantCommand> {
  constructor(
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: TenantRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(command: DeleteTenantCommand): Promise<void> {
    const tenantId = TenantId.createFromString(command.tenantId);
    const tenant = await this.tenantRepository.findById(tenantId);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    tenant.delete();
    await this.tenantRepository.save(tenant);

    // Soft delete all users belonging to this tenant
    const users = await this.userRepository.findByTenantId(tenantId);
    for (const user of users) {
      user.delete();
      await this.userRepository.save(user);
    }
  }
}
