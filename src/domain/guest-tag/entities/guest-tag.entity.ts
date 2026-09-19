import { GuestTagId } from '@/domain/guest-tag/value-objects/guest-tag-id.vo';

export const PLATFORM_TENANT_ID = '__platform__';

export class GuestTag {
  private constructor(
    private readonly id: GuestTagId | null,
    private readonly tenantId: string,
    private readonly name: string,
    private readonly createdAt: Date,
  ) {}

  static createPlatform(name: string): GuestTag {
    return new GuestTag(null, PLATFORM_TENANT_ID, name, new Date());
  }

  static reconstitute(
    id: GuestTagId,
    tenantId: string,
    name: string,
    createdAt: Date,
  ): GuestTag {
    return new GuestTag(id, tenantId, name, createdAt);
  }

  static createReference(name: string): GuestTag {
    return new GuestTag(null, PLATFORM_TENANT_ID, name, new Date());
  }

  getId(): GuestTagId | null {
    return this.id;
  }

  getTenantId(): string {
    return this.tenantId;
  }

  getName(): string {
    return this.name;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
