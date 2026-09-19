import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import {
  ExperienceAvailabilityType,
  ExperienceAvailabilityTypeEnum,
} from '@/domain/experience/value-objects/experience-availability-type.vo';
import { ExperienceCategory } from '@/domain/experience/value-objects/experience-category.vo';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';
import { ExperienceStatus } from '@/domain/experience/value-objects/experience-status.vo';
import {
  ExperienceScope,
  ExperienceScopeEnum,
} from '@/domain/experience/value-objects/experience-scope.vo';
import { DomainException } from '@/domain/shared/exceptions/domain.exception';

export interface ExperienceRecurrence {
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
}

export interface ExperienceProps {
  tenantId: TenantId;
  scope: ExperienceScope;
  propertyId?: PropertyId;
  name: string;
  description: string;
  city: string;
  category: ExperienceCategory;
  priceCop: number;
  minimumParticipants?: number;
  capacity: number;
  availabilityType: ExperienceAvailabilityType;
  recurrence?: ExperienceRecurrence;
  allowStandalonePurchase: boolean;
  allowReservationPurchase: boolean;
  mediaKeys?: string[];
}

export interface ExperienceReconstituteData {
  id: ExperienceId;
  tenantId: TenantId;
  scope: ExperienceScope;
  mediaKeys?: string[];
  propertyId?: PropertyId;
  name: string;
  description: string;
  city: string;
  category: ExperienceCategory;
  priceCop: number;
  minimumParticipants?: number;
  capacity: number;
  availabilityType: ExperienceAvailabilityType;
  recurrence?: ExperienceRecurrence;
  allowStandalonePurchase: boolean;
  allowReservationPurchase: boolean;
  minNoticeHours: number;
  purchaseCutoffHours: number;
  status: ExperienceStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface ExperienceChanges {
  scope?: ExperienceScopeEnum;
  propertyId?: string | null;
  name?: string;
  description?: string;
  city?: string;
  priceCop?: number;
  minimumParticipants?: number;
  capacity?: number;
  availabilityType?: ExperienceAvailabilityTypeEnum;
  recurrence?: ExperienceRecurrence;
  allowStandalonePurchase?: boolean;
  allowReservationPurchase?: boolean;
  mediaKeys?: string[];
}

export class Experience {
  private constructor(
    private readonly id: ExperienceId | null,
    private readonly tenantId: TenantId,
    private scope: ExperienceScope,
    private propertyId: PropertyId | null,
    private name: string,
    private description: string,
    private city: string,
    private readonly category: ExperienceCategory,
    private priceCop: number,
    private minimumParticipants: number,
    private capacity: number,
    private availabilityType: ExperienceAvailabilityType,
    private recurrence: ExperienceRecurrence | null,
    private allowStandalonePurchase: boolean,
    private allowReservationPurchase: boolean,
    private readonly minNoticeHours: number,
    private readonly purchaseCutoffHours: number,
    private readonly status: ExperienceStatus,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private deletedAt: Date | null,
    private mediaKeys: string[],
  ) {}

  static create(props: ExperienceProps): Experience {
    const now = new Date();

    const name = props.name?.trim();
    if (!name) {
      throw new Error('Experience name cannot be empty');
    }

    const description = props.description?.trim();
    if (!description) {
      throw new Error('Experience description cannot be empty');
    }

    if (description.length > 5000) {
      throw new Error('Experience description cannot exceed 5000 characters');
    }

    const city = props.city?.trim();
    if (!city) {
      throw new Error('Experience city cannot be empty');
    }

    if (!Number.isFinite(props.priceCop) || props.priceCop <= 0) {
      throw new Error('Experience price must be greater than zero');
    }

    const minimumParticipants = props.minimumParticipants ?? 1;
    Experience.validateParticipantLimits(minimumParticipants, props.capacity);

    if (!props.allowStandalonePurchase && !props.allowReservationPurchase) {
      throw new Error('Experience must be purchasable in at least one mode');
    }

    Experience.validateScope(props.scope, props.propertyId ?? null);
    Experience.validateAvailability(props.availabilityType, props.recurrence);

    return new Experience(
      null,
      props.tenantId,
      props.scope,
      props.propertyId ?? null,
      name,
      description,
      city,
      props.category,
      props.priceCop,
      minimumParticipants,
      props.capacity,
      props.availabilityType,
      props.recurrence ?? null,
      props.allowStandalonePurchase,
      props.allowReservationPurchase,
      2,
      24,
      ExperienceStatus.active(),
      now,
      now,
      null,
      props.mediaKeys ?? [],
    );
  }

  static reconstitute(data: ExperienceReconstituteData): Experience {
    return new Experience(
      data.id,
      data.tenantId,
      data.scope,
      data.propertyId ?? null,
      data.name,
      data.description,
      data.city,
      data.category,
      data.priceCop,
      data.minimumParticipants ?? 1,
      data.capacity,
      data.availabilityType,
      data.recurrence ?? null,
      data.allowStandalonePurchase,
      data.allowReservationPurchase,
      data.minNoticeHours,
      data.purchaseCutoffHours,
      data.status,
      data.createdAt,
      data.updatedAt,
      data.deletedAt ?? null,
      data.mediaKeys ?? [],
    );
  }

  getId(): ExperienceId | null {
    return this.id;
  }

  getTenantId(): TenantId {
    return this.tenantId;
  }

  getPropertyId(): PropertyId | null {
    return this.propertyId;
  }

  getScope(): ExperienceScope {
    return this.scope;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getCity(): string {
    return this.city;
  }

  getCategory(): ExperienceCategory {
    return this.category;
  }

  getPriceCop(): number {
    return this.priceCop;
  }

  getMinimumParticipants(): number {
    return this.minimumParticipants;
  }

  getCapacity(): number {
    return this.capacity;
  }

  getAvailabilityType(): ExperienceAvailabilityType {
    return this.availabilityType;
  }

  getRecurrence(): ExperienceRecurrence | null {
    return this.recurrence;
  }

  getAllowStandalonePurchase(): boolean {
    return this.allowStandalonePurchase;
  }

  getAllowReservationPurchase(): boolean {
    return this.allowReservationPurchase;
  }

  getMinNoticeHours(): number {
    return this.minNoticeHours;
  }

  getPurchaseCutoffHours(): number {
    return this.purchaseCutoffHours;
  }

  getStatus(): ExperienceStatus {
    return this.status;
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

  getMediaKeys(): string[] {
    return this.mediaKeys;
  }

  update(changes: ExperienceChanges): void {
    const name = (changes.name ?? this.name)?.trim();
    if (!name) {
      throw new Error('Experience name cannot be empty');
    }

    const description = (changes.description ?? this.description)?.trim();
    if (!description) {
      throw new Error('Experience description cannot be empty');
    }

    if (description.length > 5000) {
      throw new Error('Experience description cannot exceed 5000 characters');
    }

    const city = (changes.city ?? this.city)?.trim();
    if (!city) {
      throw new Error('Experience city cannot be empty');
    }

    const priceCop = changes.priceCop ?? this.priceCop;
    if (!Number.isFinite(priceCop) || priceCop <= 0) {
      throw new Error('Experience price must be greater than zero');
    }

    const minimumParticipants =
      changes.minimumParticipants ?? this.minimumParticipants;
    const capacity = changes.capacity ?? this.capacity;
    Experience.validateParticipantLimits(minimumParticipants, capacity);

    const allowStandalonePurchase =
      changes.allowStandalonePurchase ?? this.allowStandalonePurchase;
    const allowReservationPurchase =
      changes.allowReservationPurchase ?? this.allowReservationPurchase;
    if (!allowStandalonePurchase && !allowReservationPurchase) {
      throw new Error('Experience must be purchasable in at least one mode');
    }

    const scope = changes.scope
      ? ExperienceScope.create(changes.scope)
      : this.scope;
    const propertyId =
      changes.propertyId === undefined
        ? this.propertyId
        : changes.propertyId
          ? PropertyId.create(changes.propertyId)
          : null;
    Experience.validateScope(scope, propertyId);

    const availabilityType = changes.availabilityType
      ? ExperienceAvailabilityType.create(changes.availabilityType)
      : this.availabilityType;
    const recurrence = changes.recurrence ?? this.recurrence ?? undefined;
    Experience.validateAvailability(availabilityType, recurrence);

    this.name = name;
    this.description = description;
    this.city = city;
    this.scope = scope;
    this.propertyId = propertyId;
    this.priceCop = priceCop;
    this.minimumParticipants = minimumParticipants;
    this.capacity = capacity;
    this.availabilityType = availabilityType;
    this.recurrence = recurrence ?? null;
    this.allowStandalonePurchase = allowStandalonePurchase;
    this.allowReservationPurchase = allowReservationPurchase;
    if (changes.mediaKeys !== undefined) {
      this.mediaKeys = changes.mediaKeys;
    }
    this.updatedAt = new Date();
  }

  softDelete(): void {
    this.deletedAt = new Date();
    this.updatedAt = new Date();
  }

  validateParticipantQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new DomainException('Participants must be a positive integer');
    }

    if (quantity < this.minimumParticipants) {
      throw new DomainException(
        `This experience requires at least ${this.minimumParticipants} participant${this.minimumParticipants === 1 ? '' : 's'}`,
      );
    }

    if (quantity > this.capacity) {
      throw new DomainException(
        `This experience allows up to ${this.capacity} participant${this.capacity === 1 ? '' : 's'}`,
      );
    }
  }

  private static validateParticipantLimits(
    minimumParticipants: number,
    capacity: number,
  ): void {
    if (!Number.isInteger(minimumParticipants) || minimumParticipants <= 0) {
      throw new Error(
        'Experience minimum participants must be a positive integer',
      );
    }

    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error('Experience capacity must be a positive integer');
    }

    if (minimumParticipants > capacity) {
      throw new Error('Experience minimum participants cannot exceed capacity');
    }
  }

  private static validateScope(
    scope: ExperienceScope,
    propertyId: PropertyId | null,
  ): void {
    if (scope.isPropertyScope() && !propertyId) {
      throw new Error('Property-scoped experiences require propertyId');
    }

    if (scope.toString() === ExperienceScopeEnum.GLOBAL && propertyId) {
      throw new Error('Global experiences must not include propertyId');
    }
  }

  private static validateAvailability(
    type: ExperienceAvailabilityType,
    recurrence: ExperienceRecurrence | undefined,
  ): void {
    if (!type.isRecurring()) {
      throw new Error('Experience availabilityType must be RECURRING');
    }

    Experience.validateRecurringAvailability(recurrence);
  }

  private static validateRecurringAvailability(
    recurrence: ExperienceRecurrence | undefined,
  ): void {
    if (!recurrence) {
      throw new Error(
        'Recurring availability requires recurrence configuration',
      );
    }

    if (!recurrence.daysOfWeek?.length) {
      throw new Error(
        'Recurring availability requires at least one day of week',
      );
    }

    if (recurrence.daysOfWeek.some((day) => day < 0 || day > 6)) {
      throw new Error('Recurring daysOfWeek must be between 0 and 6');
    }

    if (!recurrence.startTime || !recurrence.endTime) {
      throw new Error('Recurring availability requires startTime and endTime');
    }
  }
}
