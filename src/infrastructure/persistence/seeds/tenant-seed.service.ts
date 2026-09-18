import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TENANT_REPOSITORY,
  type TenantRepository,
} from '@/domain/tenant/repositories/tenant.repository';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@/domain/user/repositories/user.repository';
import {
  PROPERTY_REPOSITORY,
  type PropertyRepository,
} from '@/domain/property/repositories/property.repository';
import {
  UNIT_REPOSITORY,
  type UnitRepository,
} from '@/domain/unit/repositories/unit.repository';
import { Tenant } from '@/domain/tenant/entities/tenant.entity';
import { User } from '@/domain/user/entities/user.entity';
import { Property } from '@/domain/property/entities/property.entity';
import { Unit } from '@/domain/unit/entities/unit.entity';
import { Email } from '@/domain/shared/value-objects/email.vo';
import { PlanType, PlanTypeEnum } from '@/domain/tenant/value-objects/plan-type.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import {
  PropertyType,
  PropertyTypeEnum,
} from '@/domain/property/value-objects/property-type.vo';
import {
  CancellationPolicy,
  CancellationPolicyEnum,
} from '@/domain/property/value-objects/cancellation-policy.vo';
import { Location } from '@/domain/property/value-objects/location.vo';
import { ExternalIds } from '@/domain/unit/value-objects/external-ids.vo';
import { BedTypeEnum } from '@/domain/unit/value-objects/bed-type.vo';
import { BcryptPasswordHasher } from '@/application/auth/services/password-hasher.service';

export const DEV_TENANT_OWNER_EMAIL = 'dev.owner@lymon.local';
export const DEV_TENANT_OWNER_PASSWORD = 'DevPassword123!';
export const DEV_PROPERTY_NAME = 'Dev Property';
export const DEV_UNIT_NAME = 'Dev Unit 101';

/**
 * Seeds a demo tenant, owner user, property and unit for local dev, so devs can
 * log in and land on populated screens without recreating the same rows on every
 * fresh database. Dev only — gated by isDevelopment.
 *
 * Every step checks for its own row first, so this is safe on each boot and heals
 * a partially deleted fixture instead of skipping wholesale.
 *
 * Roles and guest tags are deliberately not seeded here — RoleSeedService and
 * GuestTagSeedService own those.
 */
@Injectable()
export class TenantSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TenantSeedService.name);
  private readonly passwordHasher = new BcryptPasswordHasher();

  constructor(
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: TenantRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepository: UnitRepository,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.configService.get<string>('isDevelopment') !== 'true') {
      return;
    }

    try {
      const tenantId = await this.ensureTenantAndOwner();
      const propertyId = await this.ensureProperty(tenantId);
      await this.ensureUnit(tenantId, propertyId);
    } catch (error) {
      this.logger.error('Failed to seed dev fixtures', error);
    }
  }

  private async ensureTenantAndOwner(): Promise<TenantId> {
    const email = Email.create(DEV_TENANT_OWNER_EMAIL);

    const existing = await this.tenantRepository.findByOwnerEmail(email);
    if (existing) {
      return existing.getId()!;
    }

    const plan = PlanType.create(PlanTypeEnum.LYMON_PRIME);
    await this.tenantRepository.save(Tenant.create('Dev Tenant', email, plan));

    const tenant = await this.tenantRepository.findByOwnerEmail(email);
    if (!tenant) throw new Error('Failed to create dev tenant');
    tenant.verifyEmail();
    await this.tenantRepository.save(tenant);

    const passwordHash = await this.passwordHasher.hash(
      DEV_TENANT_OWNER_PASSWORD,
    );
    await this.userRepository.save(
      User.createOwner(email, passwordHash, tenant.getId()!),
    );

    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new Error('Failed to create dev tenant owner');
    user.verifyEmail();
    await this.userRepository.save(user);

    this.logger.log(
      `Dev tenant seeded — login with ${DEV_TENANT_OWNER_EMAIL} / ${DEV_TENANT_OWNER_PASSWORD}`,
    );
    return tenant.getId()!;
  }

  private async ensureProperty(tenantId: TenantId): Promise<PropertyId> {
    // Matched on name, not slug: the repository derives the stored slug from the
    // row id (`dev-property-41e8`), so a slug we pass in here is overwritten and
    // could never be looked up again.
    const existing = (await this.propertyRepository.findByTenantId(tenantId)).find(
      (candidate) => candidate.getName() === DEV_PROPERTY_NAME,
    );
    if (existing) {
      return existing.getId()!;
    }

    const property = Property.create({
      tenantId,
      name: DEV_PROPERTY_NAME,
      description: 'Demo property created for local development.',
      propertyType: PropertyType.create(PropertyTypeEnum.HOTEL),
      address: 'Calle 10 #43-20',
      city: 'Medellín',
      state: 'Antioquia',
      country: 'Colombia',
      zipCode: '050021',
      location: Location.create(6.2442, -75.5812),
      checkInTime: '15:00',
      checkOutTime: '12:00',
      cancellationPolicy: CancellationPolicy.create(
        CancellationPolicyEnum.FLEXIBLE,
      ),
      hostPhone: '+573001112233',
      hostEmail: DEV_TENANT_OWNER_EMAIL,
    });

    const id = await this.propertyRepository.save(property);
    this.logger.log(`Dev property seeded — ${DEV_PROPERTY_NAME}`);
    return PropertyId.create(id);
  }

  private async ensureUnit(
    tenantId: TenantId,
    propertyId: PropertyId,
  ): Promise<void> {
    const existing = await this.unitRepository.findByPropertyId(propertyId);
    if (existing.length > 0) {
      return;
    }

    const unit = Unit.create({
      tenantId,
      propertyId,
      basicInfo: {
        name: DEV_UNIT_NAME,
        description: 'Demo unit created for local development.',
      },
      inventoryConfig: { inventoryCount: 3 },
      capacityConfig: { maxGuests: 4, standardGuests: 2 },
      physicalFeatures: {
        bedrooms: [
          { roomName: 'Habitación 1', beds: [{ type: BedTypeEnum.QUEEN, count: 1 }] },
        ],
        bathroomsCount: 1,
        isShared: false,
      },
      pricingConfig: { pricePerNight: 250000 },
      amenities: ['WIFI', 'AIR_CONDITIONING'],
      externalIds: ExternalIds.create(),
    });

    await this.unitRepository.save(unit);
    this.logger.log(`Dev unit seeded — ${DEV_UNIT_NAME}`);
  }
}
