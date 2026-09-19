import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { CancellationPolicy } from '@/domain/property/value-objects/cancellation-policy.vo';
import { Location } from '@/domain/property/value-objects/location.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { PropertyType } from '@/domain/property/value-objects/property-type.vo';
import { createSlug } from '@/domain/shared/utils/slug.util';

export interface PropertyProps {
  tenantId: TenantId;
  name: string;
  slug?: string;
  description: string;
  propertyType: PropertyType;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  location: Location;
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy: CancellationPolicy;
  hostPhone: string;
  hostEmail: string;
  imageKey?: string;
}

export interface PropertyUpdateData {
  name?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  location?: Location;
}

export interface PropertyReconstituteData {
  id: PropertyId;
  tenantId: TenantId;
  name: string;
  slug?: string;
  description: string;
  propertyType: PropertyType;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  location: Location;
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy: CancellationPolicy;
  hostPhone: string;
  hostEmail: string;
  imageKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export class Property {
  private constructor(
    private readonly id: PropertyId | null,
    private readonly tenantId: TenantId,
    private name: string,
    private slug: string,
    private description: string,
    private readonly propertyType: PropertyType,
    private address: string,
    private city: string,
    private state: string,
    private country: string,
    private zipCode: string,
    private location: Location,
    private checkInTime: string,
    private checkOutTime: string,
    private cancellationPolicy: CancellationPolicy,
    private hostPhone: string,
    private hostEmail: string,
    private imageKey: string | null,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private deletedAt: Date | null,
  ) {}

  static create(props: PropertyProps): Property {
    if (!props.name || props.name.trim() === '') {
      throw new Error('Property name cannot be empty');
    }

    if (!props.address || props.address.trim() === '') {
      throw new Error('Property address cannot be empty');
    }

    return new Property(
      null,
      props.tenantId,
      props.name.trim(),
      props.slug ?? createSlug(props.name),
      props.description.trim(),
      props.propertyType,
      props.address.trim(),
      props.city.trim(),
      props.state.trim(),
      props.country.trim(),
      props.zipCode.trim(),
      props.location,
      props.checkInTime,
      props.checkOutTime,
      props.cancellationPolicy,
      props.hostPhone,
      props.hostEmail,
      props.imageKey ?? null,
      new Date(),
      new Date(),
      null,
    );
  }

  static reconstitute(data: PropertyReconstituteData): Property {
    return new Property(
      data.id,
      data.tenantId,
      data.name,
      data.slug ?? createSlug(data.name),
      data.description,
      data.propertyType,
      data.address,
      data.city,
      data.state,
      data.country,
      data.zipCode,
      data.location,
      data.checkInTime,
      data.checkOutTime,
      data.cancellationPolicy,
      data.hostPhone,
      data.hostEmail,
      data.imageKey ?? null,
      data.createdAt,
      data.updatedAt,
      data.deletedAt ?? null,
    );
  }

  getId(): PropertyId | null {
    return this.id;
  }

  getTenantId(): TenantId {
    return this.tenantId;
  }

  getName(): string {
    return this.name;
  }

  getSlug(): string {
    return this.slug;
  }

  getDescription(): string {
    return this.description;
  }

  getPropertyType(): PropertyType {
    return this.propertyType;
  }

  getAddress(): string {
    return this.address;
  }

  getCity(): string {
    return this.city;
  }

  getState(): string {
    return this.state;
  }

  getCountry(): string {
    return this.country;
  }

  getZipCode(): string {
    return this.zipCode;
  }

  getLocation(): Location {
    return this.location;
  }

  getCheckInTime(): string {
    return this.checkInTime;
  }

  getCheckOutTime(): string {
    return this.checkOutTime;
  }

  getCancellationPolicy(): CancellationPolicy {
    return this.cancellationPolicy;
  }

  getHostPhone(): string {
    return this.hostPhone;
  }

  getHostEmail(): string {
    return this.hostEmail;
  }

  getImageKey(): string | null {
    return this.imageKey;
  }

  updateImageKey(imageKey: string | null): void {
    this.imageKey = imageKey;
    this.updatedAt = new Date();
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

  updateDetails(data: PropertyUpdateData): void {
    if (data.name && data.name.trim() !== '') {
      this.name = data.name.trim();
      this.slug = createSlug(this.name);
    }
    if (data.description !== undefined) {
      this.description = data.description.trim();
    }
    if (data.address && data.address.trim() !== '') {
      this.address = data.address.trim();
    }
    if (data.city && data.city.trim() !== '') {
      this.city = data.city.trim();
    }
    if (data.state && data.state.trim() !== '') {
      this.state = data.state.trim();
    }
    if (data.country && data.country.trim() !== '') {
      this.country = data.country.trim();
    }
    if (data.zipCode && data.zipCode.trim() !== '') {
      this.zipCode = data.zipCode.trim();
    }
    if (data.location) {
      this.location = data.location;
    }
    this.updatedAt = new Date();
  }

  updateCheckInOut(checkInTime: string, checkOutTime: string): void {
    this.checkInTime = checkInTime;
    this.checkOutTime = checkOutTime;
    this.updatedAt = new Date();
  }

  updateCancellationPolicy(policy: CancellationPolicy): void {
    this.cancellationPolicy = policy;
    this.updatedAt = new Date();
  }

  updateHostContact(phone: string, email: string): void {
    this.hostPhone = phone;
    this.hostEmail = email;
    this.updatedAt = new Date();
  }

  softDelete(): void {
    const now = new Date();
    this.deletedAt = now;
    this.updatedAt = now;
  }
}
