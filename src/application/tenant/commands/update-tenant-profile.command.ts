import { TenantTheme } from '@/domain/tenant/value-objects/tenant-theme';

export class UpdateTenantProfileCommand {
  constructor(
    public readonly tenantId: string,
    public readonly name: string | undefined,
    public readonly contactPhone: string | null | undefined,
    public readonly address: string | null | undefined,
    public readonly description: string | null | undefined,
    public readonly theme: TenantTheme | null | undefined,
    public readonly logoKey: string | null | undefined,
    public readonly actorId: string,
    public readonly actorEmail: string,
  ) {}
}
