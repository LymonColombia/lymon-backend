import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { GetTenantProfileQuery } from './get-tenant-profile.query';
import {
  GetTenantProfileResult,
  TenantProfileDto,
} from './get-tenant-profile.result';
import {
  TENANT_REPOSITORY,
  type TenantRepository,
} from '@/domain/tenant/repositories/tenant.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import {
  R2StorageService,
  R2_STORAGE_SERVICE,
} from '@/infrastructure/storage/r2-storage.service';

@QueryHandler(GetTenantProfileQuery)
export class GetTenantProfileQueryHandler implements IQueryHandler<
  GetTenantProfileQuery,
  GetTenantProfileResult
> {
  constructor(
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: TenantRepository,
    @Inject(R2_STORAGE_SERVICE)
    private readonly storageService: R2StorageService,
  ) {}

  async execute(query: GetTenantProfileQuery): Promise<GetTenantProfileResult> {
    const tenant = await this.tenantRepository.findById(
      TenantId.createFromString(query.tenantId),
    );

    if (!tenant) {
      throw new NotFoundException(`Tenant not found`);
    }

    const logoKey = tenant.getLogoKey();

    return new GetTenantProfileResult(
      new TenantProfileDto(
        tenant.getId()!.toString(),
        tenant.getSlug(),
        tenant.getName(),
        tenant.getOwnerEmail().toString(),
        tenant.getPlan().toString(),
        tenant.getContactPhone(),
        tenant.getAddress(),
        tenant.getDescription(),
        logoKey ? this.storageService.getPublicUrl(logoKey) : null,
        tenant.getTheme(),
        tenant.isEmailVerified(),
        tenant.getCreatedAt(),
        tenant.getUpdatedAt(),
      ),
    );
  }
}
