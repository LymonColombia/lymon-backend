import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { ExternalIds } from '@/domain/unit/value-objects/external-ids.vo';
import { Bedroom } from '@/domain/unit/value-objects/bed-type.vo';

// ─── Input interfaces to reduce parameter count ──────────────────────────────

export interface UnitBasicInfo {
  name: string;
  description: string;
}

export interface UnitInventoryConfig {
  inventoryCount: number;
}

export interface UnitCapacityConfig {
  maxGuests: number;
  standardGuests: number;
}

export interface UnitPhysicalFeatures {
  bedrooms: Bedroom[];
  bathroomsCount: number;
  isShared: boolean;
}

export interface UnitPricingConfig {
  pricePerNight: number;
}

export interface UnitCreateInput {
  tenantId: TenantId;
  propertyId: PropertyId;
  basicInfo: UnitBasicInfo;
  inventoryConfig: UnitInventoryConfig;
  capacityConfig: UnitCapacityConfig;
  physicalFeatures: UnitPhysicalFeatures;
  pricingConfig: UnitPricingConfig;
  amenities: string[];
  externalIds: ExternalIds;
  mediaKeys?: string[];
}

export interface UnitTimestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface UnitReconstituteInput extends UnitCreateInput {
  id: UnitId;
  timestamps: UnitTimestamps;
  rating?: number | null;
}

export class Unit {
  private constructor(
    private readonly id: UnitId | null,
    private readonly tenantId: TenantId,
    private readonly propertyId: PropertyId,
    private name: string,
    private description: string,
    private inventoryCount: number,
    private maxGuests: number,
    private standardGuests: number,
    private bedrooms: Bedroom[],
    private bathroomsCount: number,
    private isShared: boolean,
    private amenities: string[],
    private mediaKeys: string[],
    private pricePerNight: number,
    private externalIds: ExternalIds,
    private rating: number | null,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private readonly deletedAt: Date | null,
  ) {}

  static create(input: UnitCreateInput): Unit {
    const {
      tenantId,
      propertyId,
      basicInfo,
      inventoryConfig,
      capacityConfig,
      physicalFeatures,
      pricingConfig,
      amenities,
      externalIds,
    } = input;

    if (!basicInfo.name || basicInfo.name.trim() === '') {
      throw new Error('Unit name cannot be empty');
    }

    if (inventoryConfig.inventoryCount < 1) {
      throw new Error('Inventory count must be at least 1');
    }

    if (capacityConfig.maxGuests < 1) {
      throw new Error('Max guests must be at least 1');
    }

    if (
      capacityConfig.standardGuests < 1 ||
      capacityConfig.standardGuests > capacityConfig.maxGuests
    ) {
      throw new Error('Standard guests must be between 1 and max guests');
    }

    if (pricingConfig.pricePerNight < 0) {
      throw new Error('Price per night cannot be negative');
    }

    return new Unit(
      null,
      tenantId,
      propertyId,
      basicInfo.name.trim(),
      basicInfo.description.trim(),
      inventoryConfig.inventoryCount,
      capacityConfig.maxGuests,
      capacityConfig.standardGuests,
      physicalFeatures.bedrooms,
      physicalFeatures.bathroomsCount,
      physicalFeatures.isShared,
      amenities,
      input.mediaKeys ?? [],
      pricingConfig.pricePerNight,
      externalIds,
      null,
      new Date(),
      new Date(),
      null,
    );
  }

  static reconstitute(input: UnitReconstituteInput): Unit {
    const {
      id,
      tenantId,
      propertyId,
      basicInfo,
      inventoryConfig,
      capacityConfig,
      physicalFeatures,
      pricingConfig,
      amenities,
      externalIds,
      timestamps,
    } = input;

    return new Unit(
      id,
      tenantId,
      propertyId,
      basicInfo.name,
      basicInfo.description,
      inventoryConfig.inventoryCount,
      capacityConfig.maxGuests,
      capacityConfig.standardGuests,
      physicalFeatures.bedrooms,
      physicalFeatures.bathroomsCount,
      physicalFeatures.isShared,
      amenities,
      input.mediaKeys ?? [],
      pricingConfig.pricePerNight,
      externalIds,
      input.rating ?? null,
      timestamps.createdAt,
      timestamps.updatedAt,
      null,
    );
  }

  getId(): UnitId | null {
    return this.id;
  }

  getTenantId(): TenantId {
    return this.tenantId;
  }

  getPropertyId(): PropertyId {
    return this.propertyId;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getInventoryCount(): number {
    return this.inventoryCount;
  }

  getMaxGuests(): number {
    return this.maxGuests;
  }

  getStandardGuests(): number {
    return this.standardGuests;
  }

  getBedrooms(): Bedroom[] {
    return this.bedrooms;
  }

  getBathroomsCount(): number {
    return this.bathroomsCount;
  }

  getIsShared(): boolean {
    return this.isShared;
  }

  getAmenities(): string[] {
    return this.amenities;
  }

  getMediaKeys(): string[] {
    return this.mediaKeys;
  }

  getPricePerNight(): number {
    return this.pricePerNight;
  }

  getExternalIds(): ExternalIds {
    return this.externalIds;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getDeletedAt(): Date | null {
    return this.deletedAt;
  }

  updateDetails(name: string, description: string): void {
    if (name && name.trim() !== '') {
      this.name = name.trim();
    }
    if (description !== undefined) {
      this.description = description.trim();
    }
    this.updatedAt = new Date();
  }

  updateCapacity(maxGuests: number, standardGuests: number): void {
    if (maxGuests < 1) {
      throw new Error('Max guests must be at least 1');
    }
    if (standardGuests < 1 || standardGuests > maxGuests) {
      throw new Error('Standard guests must be between 1 and max guests');
    }
    this.maxGuests = maxGuests;
    this.standardGuests = standardGuests;
    this.updatedAt = new Date();
  }

  updateInventoryCount(inventoryCount: number): void {
    if (inventoryCount < 1) {
      throw new Error('Inventory count must be at least 1');
    }

    this.inventoryCount = inventoryCount;
    this.updatedAt = new Date();
  }

  updateBedrooms(bedrooms: Bedroom[]): void {
    this.bedrooms = bedrooms;
    this.updatedAt = new Date();
  }

  updateBathroomsCount(bathroomsCount: number): void {
    if (bathroomsCount < 0) {
      throw new Error('Bathrooms count cannot be negative');
    }

    this.bathroomsCount = bathroomsCount;
    this.updatedAt = new Date();
  }

  updateShared(isShared: boolean): void {
    this.isShared = isShared;
    this.updatedAt = new Date();
  }

  updatePrice(pricePerNight: number): void {
    if (pricePerNight < 0) {
      throw new Error('Price per night cannot be negative');
    }
    this.pricePerNight = pricePerNight;
    this.updatedAt = new Date();
  }

  updateAmenities(amenities: string[]): void {
    this.amenities = amenities;
    this.updatedAt = new Date();
  }

  updateMediaKeys(mediaKeys: string[]): void {
    this.mediaKeys = mediaKeys;
    this.updatedAt = new Date();
  }

  updateExternalIds(externalIds: ExternalIds): void {
    this.externalIds = externalIds;
    this.updatedAt = new Date();
  }

  getRating(): number | null {
    return this.rating;
  }

  updateRating(newRating: number | null): void {
    this.rating = newRating;
    this.updatedAt = new Date();
  }
}
