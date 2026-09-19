import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GuestPreferenceCategoryEnum } from '@/domain/guest-preference/value-objects/guest-preference-category.vo';
import { GuestPreferencePredefinedKeyEnum } from '@/domain/guest-preference/value-objects/guest-preference-predefined-key.vo';

export enum GuestPreferenceSourceEnum {
  PREDEFINED = 'PREDEFINED',
  CUSTOM = 'CUSTOM',
}

export interface CreateGuestPreferenceCatalogItemParams {
  tenantId: TenantId;
  category: GuestPreferenceCategoryEnum;
  source: GuestPreferenceSourceEnum;
  key?: GuestPreferencePredefinedKeyEnum | null;
  label?: string | null;
}

export interface GuestPreferenceCatalogItemReconstitutionData {
  id: string;
  tenantId: TenantId;
  category: GuestPreferenceCategoryEnum;
  source: GuestPreferenceSourceEnum;
  key: GuestPreferencePredefinedKeyEnum | null;
  label: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class GuestPreferenceCatalogItem {
  private constructor(
    private readonly id: string | null,
    private readonly tenantId: TenantId,
    private category: GuestPreferenceCategoryEnum,
    private readonly source: GuestPreferenceSourceEnum,
    private readonly key: GuestPreferencePredefinedKeyEnum | null,
    private label: string | null,
    private isActive: boolean,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(
    params: CreateGuestPreferenceCatalogItemParams,
  ): GuestPreferenceCatalogItem {
    if (params.source === GuestPreferenceSourceEnum.PREDEFINED) {
      if (!params.key) {
        throw new Error('Predefined preference must have a key');
      }
      if (params.label) {
        throw new Error('Predefined preference must not have a label');
      }
    }

    if (params.source === GuestPreferenceSourceEnum.CUSTOM) {
      if (!params.label?.trim()) {
        throw new Error('Custom preference must have a label');
      }
      if (params.key) {
        throw new Error('Custom preference must not have a key');
      }
    }

    return new GuestPreferenceCatalogItem(
      null,
      params.tenantId,
      params.category,
      params.source,
      params.key ?? null,
      params.label?.trim() ?? null,
      true,
      new Date(),
      new Date(),
    );
  }

  static reconstitute(
    data: GuestPreferenceCatalogItemReconstitutionData,
  ): GuestPreferenceCatalogItem {
    return new GuestPreferenceCatalogItem(
      data.id,
      data.tenantId,
      data.category,
      data.source,
      data.key,
      data.label,
      data.isActive,
      data.createdAt,
      data.updatedAt,
    );
  }

  update(label: string, category: GuestPreferenceCategoryEnum): void {
    const normalized = label.trim();
    if (!normalized) {
      throw new Error('Custom preference label cannot be empty');
    }
    this.label = normalized;
    this.category = category;
    this.touch();
  }

  activate(): void {
    this.isActive = true;
    this.touch();
  }

  deactivate(): void {
    this.isActive = false;
    this.touch();
  }

  getId(): string | null {
    return this.id;
  }

  getTenantId(): TenantId {
    return this.tenantId;
  }

  getCategory(): GuestPreferenceCategoryEnum {
    return this.category;
  }

  getSource(): GuestPreferenceSourceEnum {
    return this.source;
  }

  getKey(): GuestPreferencePredefinedKeyEnum | null {
    return this.key;
  }

  getLabel(): string | null {
    return this.label;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}
