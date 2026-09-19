import { TenantTheme } from '@/domain/tenant/value-objects/tenant-theme';

export class TenantProfileDto {
  constructor(
    public readonly id: string,
    public readonly slug: string,
    public readonly name: string,
    public readonly ownerEmail: string,
    public readonly plan: string,
    public readonly contactPhone: string | null,
    public readonly address: string | null,
    public readonly description: string | null,
    public readonly logoUrl: string | null,
    public readonly theme: TenantTheme | null,
    public readonly emailVerified: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

export class GetTenantProfileResult {
  constructor(public readonly profile: TenantProfileDto) {}
}
