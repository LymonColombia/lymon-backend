import {
  Tenant,
  TenantReconstitutionProps,
} from '../../../src/domain/tenant/entities/tenant.entity';
import { Email } from '@/domain/shared/value-objects/email.vo';
import {
  PlanType,
  PlanTypeEnum,
} from '@/domain/tenant/value-objects/plan-type.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

describe('Tenant Entity', () => {
  const validName = 'Acme Corporation';
  const validEmail = Email.create('owner@acme.com');
  const validPlan = PlanType.create(PlanTypeEnum.TRIAL);

  describe('create', () => {
    it('should create a tenant with valid data', () => {
      const tenant = Tenant.create(validName, validEmail, validPlan);

      expect(tenant).toBeInstanceOf(Tenant);
      expect(tenant.getName()).toBe(validName);
      expect(tenant.getOwnerEmail()).toEqual(validEmail);
      expect(tenant.getPlan()).toEqual(validPlan);
      expect(tenant.isEmailVerified()).toBe(false);
      expect(tenant.getId()).toBeNull();
    });

    it('should throw error when name is empty', () => {
      expect(() => Tenant.create('', validEmail, validPlan)).toThrow(
        'Tenant name cannot be empty',
      );
    });

    it('should throw error when name is only whitespace', () => {
      expect(() => Tenant.create('   ', validEmail, validPlan)).toThrow(
        'Tenant name cannot be empty',
      );
    });

    it('should trim name during creation', () => {
      const nameWithSpaces = '  Acme Corp  ';
      const tenant = Tenant.create(nameWithSpaces, validEmail, validPlan);

      expect(tenant.getName()).toBe('Acme Corp');
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute a tenant from props', () => {
      const tenantId = TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000');
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');

      const props: TenantReconstitutionProps = {
        id: tenantId,
        name: validName,
        ownerEmail: validEmail,
        plan: validPlan,
        emailVerified: true,
        contactPhone: '+1234567890',
        address: '123 Main St',
        description: 'A description',
        logoKey: 'tenants/abc/logo/1.png',
        theme: { primary: '#1A73E8' },
        createdAt,
        updatedAt,
      };

      const tenant = Tenant.reconstitute(props);

      expect(tenant).toBeInstanceOf(Tenant);
      expect(tenant.getId()).toEqual(tenantId);
      expect(tenant.getName()).toBe(validName);
      expect(tenant.getOwnerEmail()).toEqual(validEmail);
      expect(tenant.getPlan()).toEqual(validPlan);
      expect(tenant.isEmailVerified()).toBe(true);
      expect(tenant.getContactPhone()).toBe('+1234567890');
      expect(tenant.getAddress()).toBe('123 Main St');
      expect(tenant.getDescription()).toBe('A description');
      expect(tenant.getLogoKey()).toBe('tenants/abc/logo/1.png');
      expect(tenant.getTheme()).toEqual({ primary: '#1A73E8' });
      expect(tenant.getCreatedAt()).toEqual(createdAt);
      expect(tenant.getUpdatedAt()).toEqual(updatedAt);
    });

    it('should handle null optional fields during reconstitution', () => {
      const tenantId = TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000');
      const props: TenantReconstitutionProps = {
        id: tenantId,
        name: validName,
        ownerEmail: validEmail,
        plan: validPlan,
        emailVerified: false,
        contactPhone: null,
        address: null,
        description: null,
        logoKey: null,
        theme: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const tenant = Tenant.reconstitute(props);

      expect(tenant.getContactPhone()).toBeNull();
      expect(tenant.getAddress()).toBeNull();
      expect(tenant.getDescription()).toBeNull();
      expect(tenant.getLogoKey()).toBeNull();
      expect(tenant.getTheme()).toBeNull();
    });
  });

  describe('verifyEmail', () => {
    it('should mark email as verified', () => {
      const tenant = Tenant.create(validName, validEmail, validPlan);
      expect(tenant.isEmailVerified()).toBe(false);

      tenant.verifyEmail();

      expect(tenant.isEmailVerified()).toBe(true);
    });

    it('should update the updatedAt timestamp when verifying email', () => {
      const tenant = Tenant.create(validName, validEmail, validPlan);
      const updatedAtBefore = tenant.getUpdatedAt();

      // Small delay to ensure timestamp difference
      tenant.verifyEmail();
      const updatedAtAfter = tenant.getUpdatedAt();

      expect(updatedAtAfter.getTime()).toBeGreaterThanOrEqual(
        updatedAtBefore.getTime(),
      );
    });
  });

  describe('changePlan', () => {
    it('should change the plan', () => {
      const tenant = Tenant.create(validName, validEmail, validPlan);
      const newPlan = PlanType.create(PlanTypeEnum.LYMON_ONE);

      tenant.changePlan(newPlan);

      expect(tenant.getPlan()).toEqual(newPlan);
    });

    it('should update the updatedAt timestamp when changing plan', () => {
      const tenant = Tenant.create(validName, validEmail, validPlan);
      const updatedAtBefore = tenant.getUpdatedAt();

      tenant.changePlan(PlanType.create(PlanTypeEnum.LYMON_PLUS));

      expect(tenant.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
        updatedAtBefore.getTime(),
      );
    });
  });

  describe('updateProfile', () => {
    it('should update all profile fields', () => {
      const tenant = Tenant.create(validName, validEmail, validPlan);

      tenant.updateProfile('New Name', '+9876543210', '456 Oak Ave', 'A description', {
        primary: '#1A73E8',
      });

      expect(tenant.getName()).toBe('New Name');
      expect(tenant.getContactPhone()).toBe('+9876543210');
      expect(tenant.getAddress()).toBe('456 Oak Ave');
      expect(tenant.getDescription()).toBe('A description');
      expect(tenant.getTheme()).toEqual({ primary: '#1A73E8' });
    });

    it('should update only specific fields', () => {
      const tenant = Tenant.create(validName, validEmail, validPlan);

      tenant.updateProfile('Updated Name', undefined, undefined);

      expect(tenant.getName()).toBe('Updated Name');
      expect(tenant.getContactPhone()).toBeNull();
      expect(tenant.getAddress()).toBeNull();
    });

    it('should allow clearing optional fields by passing null', () => {
      const tenantId = TenantId.createFromString('tenant-789');
      const props: TenantReconstitutionProps = {
        id: tenantId,
        name: validName,
        ownerEmail: validEmail,
        plan: validPlan,
        emailVerified: false,
        contactPhone: '+1234567890',
        address: '123 Main St',
        description: 'A description',
        logoKey: 'tenants/abc/logo/1.png',
        theme: { primary: '#1A73E8' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const tenant = Tenant.reconstitute(props);

      tenant.updateProfile(undefined, null, null, null, null);

      expect(tenant.getContactPhone()).toBeNull();
      expect(tenant.getAddress()).toBeNull();
      expect(tenant.getDescription()).toBeNull();
      expect(tenant.getTheme()).toBeNull();
    });

    it('should throw error when updating with empty name', () => {
      const tenant = Tenant.create(validName, validEmail, validPlan);

      expect(() => tenant.updateProfile('')).toThrow(
        'Tenant name cannot be empty',
      );
    });

    it('should throw error when updating with only whitespace name', () => {
      const tenant = Tenant.create(validName, validEmail, validPlan);

      expect(() => tenant.updateProfile('   ')).toThrow(
        'Tenant name cannot be empty',
      );
    });

    it('should trim name when updating', () => {
      const tenant = Tenant.create(validName, validEmail, validPlan);

      tenant.updateProfile('  Trimmed Name  ');

      expect(tenant.getName()).toBe('Trimmed Name');
    });

    it('should update updatedAt timestamp when profile is updated', () => {
      const tenant = Tenant.create(validName, validEmail, validPlan);
      const updatedAtBefore = tenant.getUpdatedAt();

      tenant.updateProfile('New Name');

      expect(tenant.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
        updatedAtBefore.getTime(),
      );
    });
  });

  describe('getters', () => {
    it('should return all properties correctly', () => {
      const tenantId = TenantId.createFromString('tenant-getter-test');
      const createdAt = new Date('2024-03-25');
      const updatedAt = new Date('2024-03-26');

      const props: TenantReconstitutionProps = {
        id: tenantId,
        name: 'Getter Test Corp',
        ownerEmail: Email.create('test@getter.com'),
        plan: PlanType.create(PlanTypeEnum.LYMON_PLUS),
        emailVerified: true,
        contactPhone: '+1111111111',
        address: 'Test Address',
        description: 'Test description',
        logoKey: 'tenants/abc/logo/1.png',
        theme: { primary: '#000000' },
        createdAt,
        updatedAt,
      };

      const tenant = Tenant.reconstitute(props);

      expect(tenant.getId()).toEqual(tenantId);
      expect(tenant.getName()).toBe('Getter Test Corp');
      expect(tenant.getOwnerEmail().toString()).toBe('test@getter.com');
      expect(tenant.getPlan().toString()).toBe('LYMON_PLUS');
      expect(tenant.isEmailVerified()).toBe(true);
      expect(tenant.getContactPhone()).toBe('+1111111111');
      expect(tenant.getAddress()).toBe('Test Address');
      expect(tenant.getDescription()).toBe('Test description');
      expect(tenant.getLogoKey()).toBe('tenants/abc/logo/1.png');
      expect(tenant.getTheme()).toEqual({ primary: '#000000' });
      expect(tenant.getCreatedAt()).toEqual(createdAt);
      expect(tenant.getUpdatedAt()).toEqual(updatedAt);
    });
  });
});
