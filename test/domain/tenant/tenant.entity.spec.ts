import { Tenant } from '@/domain/tenant/entities/tenant.entity';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { Email } from '@/domain/shared/value-objects/email.vo';
import { PlanType } from '@/domain/tenant/value-objects/plan-type.vo';

describe('Tenant Entity - COMPREHENSIVE COVERAGE', () => {
  const TENANT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000';
  const OWNER_EMAIL = 'owner@example.com';
  const TENANT_NAME = 'Acme Corporation';

  // ─── Fixtures ────────────────────────────────────────────────────────────

  function createValidEmail(): Email {
    return Email.create(OWNER_EMAIL);
  }

  function createValidPlan(): PlanType {
    return PlanType.create('LYMON_ONE');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  TENANT.CREATE - BASIC HAPPY PATH
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Tenant.create - BASIC HAPPY PATH', () => {
    it('TT-001: should create a tenant with valid input', () => {
      const email = createValidEmail();
      const plan = createValidPlan();

      const tenant = Tenant.create(TENANT_NAME, email, plan);

      expect(tenant).toBeDefined();
      expect(tenant.getId()).toBeNull();
      expect(tenant.getName()).toBe(TENANT_NAME);
      expect(tenant.getOwnerEmail()).toEqual(email);
      expect(tenant.getPlan()).toEqual(plan);
    });

    it('TT-002: should trim name with leading/trailing spaces', () => {
      const email = createValidEmail();
      const plan = createValidPlan();

      const tenant = Tenant.create('  Acme Corporation  ', email, plan);

      expect(tenant.getName()).toBe('Acme Corporation');
    });

    it('TT-003: should initialize with default values', () => {
      const email = createValidEmail();
      const plan = createValidPlan();

      const tenant = Tenant.create(TENANT_NAME, email, plan);

      expect(tenant.isEmailVerified()).toBe(false);
      expect(tenant.getContactPhone()).toBeNull();
      expect(tenant.getAddress()).toBeNull();
      expect(tenant.getDescription()).toBeNull();
      expect(tenant.getLogoKey()).toBeNull();
      expect(tenant.getTheme()).toBeNull();
    });

    it('TT-004: should set timestamps on creation', () => {
      const email = createValidEmail();
      const plan = createValidPlan();
      const beforeCreate = new Date();

      const tenant = Tenant.create(TENANT_NAME, email, plan);

      const afterCreate = new Date();
      expect(tenant.getCreatedAt().getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime(),
      );
      expect(tenant.getCreatedAt().getTime()).toBeLessThanOrEqual(
        afterCreate.getTime(),
      );
      expect(tenant.getUpdatedAt()).toEqual(tenant.getCreatedAt());
    });

    it('TT-005: should accept single character name', () => {
      const email = createValidEmail();
      const plan = createValidPlan();

      const tenant = Tenant.create('A', email, plan);

      expect(tenant.getName()).toBe('A');
    });

    it('TT-006: should accept very long name', () => {
      const email = createValidEmail();
      const plan = createValidPlan();
      const longName = 'A'.repeat(500);

      const tenant = Tenant.create(longName, email, plan);

      expect(tenant.getName()).toBe('A'.repeat(500));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  TENANT.CREATE - TRIAL EXPIRY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Tenant.create - TRIAL EXPIRY', () => {
    it('sets trialEndsAt ~5 days out for TRIAL plan', () => {
      const email = createValidEmail();
      const plan = PlanType.create('TRIAL');
      const before = Date.now();

      const tenant = Tenant.create(TENANT_NAME, email, plan);

      const expectedMs = before + 5 * 24 * 60 * 60 * 1000;
      expect(tenant.getTrialEndsAt()).not.toBeNull();
      expect(tenant.getTrialEndsAt()!.getTime()).toBeGreaterThanOrEqual(
        expectedMs - 1000,
      );
      expect(tenant.getTrialEndsAt()!.getTime()).toBeLessThanOrEqual(
        expectedMs + 5000,
      );
      expect(tenant.isTrialExpired()).toBe(false);
      expect(tenant.getTrialDaysRemaining()).toBe(5);
    });

    it('leaves trialEndsAt null for non-TRIAL plans', () => {
      const email = createValidEmail();
      const plan = createValidPlan();

      const tenant = Tenant.create(TENANT_NAME, email, plan);

      expect(tenant.getTrialEndsAt()).toBeNull();
      expect(tenant.isTrialExpired()).toBe(false);
      expect(tenant.getTrialDaysRemaining()).toBeNull();
    });

    it('isTrialExpired is true once trialEndsAt is in the past', () => {
      const email = createValidEmail();
      const plan = createValidPlan();
      const tenant = Tenant.reconstitute({
        id: TenantId.createFromString(TENANT_ID),
        name: TENANT_NAME,
        ownerEmail: email,
        plan,
        emailVerified: false,
        contactPhone: null,
        address: null,
        description: null,
        logoKey: null,
        theme: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        trialEndsAt: new Date(Date.now() - 1000),
      });

      expect(tenant.isTrialExpired()).toBe(true);
      expect(tenant.getTrialDaysRemaining()).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  TENANT.CREATE - VALIDATION: NAME
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Tenant.create - VALIDATION: NAME', () => {
    it('TT-007: should throw error when name is empty string', () => {
      const email = createValidEmail();
      const plan = createValidPlan();

      expect(() => Tenant.create('', email, plan)).toThrow(
        'Tenant name cannot be empty',
      );
    });

    it('TT-008: should throw error when name is only whitespace', () => {
      const email = createValidEmail();
      const plan = createValidPlan();

      expect(() => Tenant.create('   ', email, plan)).toThrow(
        'Tenant name cannot be empty',
      );
    });

    it('TT-009: should throw error when name is tabs and newlines', () => {
      const email = createValidEmail();
      const plan = createValidPlan();

      expect(() => Tenant.create('\t\n', email, plan)).toThrow(
        'Tenant name cannot be empty',
      );
    });

    it('TT-010: should throw error when name contains only spaces', () => {
      const email = createValidEmail();
      const plan = createValidPlan();

      expect(() => Tenant.create('     ', email, plan)).toThrow(
        'Tenant name cannot be empty',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  ALL GETTERS - COMPREHENSIVE COVERAGE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Getter Methods - COMPREHENSIVE', () => {
    let tenant: Tenant;
    let email: Email;
    let plan: PlanType;

    beforeEach(() => {
      email = createValidEmail();
      plan = createValidPlan();
      tenant = Tenant.create(TENANT_NAME, email, plan);
    });

    it('TT-011: getId returns null for newly created tenant', () => {
      expect(tenant.getId()).toBeNull();
    });

    it('TT-012: getName returns correct name', () => {
      expect(tenant.getName()).toBe(TENANT_NAME);
    });

    it('TT-013: getOwnerEmail returns correct email', () => {
      expect(tenant.getOwnerEmail()).toEqual(email);
    });

    it('TT-014: getPlan returns correct plan', () => {
      expect(tenant.getPlan()).toEqual(plan);
    });

    it('TT-015: isEmailVerified returns false initially', () => {
      expect(tenant.isEmailVerified()).toBe(false);
    });

    it('TT-016: getContactPhone returns null initially', () => {
      expect(tenant.getContactPhone()).toBeNull();
    });

    it('TT-017: getAddress returns null initially', () => {
      expect(tenant.getAddress()).toBeNull();
    });

    it('TT-018: getDescription returns null initially', () => {
      expect(tenant.getDescription()).toBeNull();
    });

    it('TT-019: getLogoKey returns null initially', () => {
      expect(tenant.getLogoKey()).toBeNull();
    });

    it('TT-019b: getTheme returns null initially', () => {
      expect(tenant.getTheme()).toBeNull();
    });

    it('TT-020: getCreatedAt returns valid date', () => {
      const createdAt = tenant.getCreatedAt();
      expect(createdAt instanceof Date).toBe(true);
      expect(createdAt.getTime()).toBeGreaterThan(0);
    });

    it('TT-021: getUpdatedAt returns valid date', () => {
      const updatedAt = tenant.getUpdatedAt();
      expect(updatedAt instanceof Date).toBe(true);
      expect(updatedAt.getTime()).toBeGreaterThan(0);
    });

    it('TT-022: createdAt and updatedAt are initially equal', () => {
      expect(tenant.getUpdatedAt()).toEqual(tenant.getCreatedAt());
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  TENANT.RECONSTITUTE - COMPREHENSIVE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Tenant.reconstitute - COMPREHENSIVE', () => {
    it('TT-023: should reconstitute with all fields', () => {
      const createdAt = new Date('2030-01-01');
      const updatedAt = new Date('2030-02-01');
      const email = createValidEmail();
      const plan = createValidPlan();

      const tenant = Tenant.reconstitute({
        id: TenantId.createFromString(TENANT_ID),
        name: TENANT_NAME,
        ownerEmail: email,
        plan: plan,
        emailVerified: true,
        contactPhone: '+1234567890',
        address: '123 Main St',
        description: 'A lovely place',
        logoKey: 'tenants/65f1a1a2b3c4d5e6f7a8b9c0/logo/123.png',
        theme: { primary: '#1A73E8' },
        createdAt,
        updatedAt,
      });

      expect(tenant.getId()?.toString()).toBe(TENANT_ID);
      expect(tenant.getName()).toBe(TENANT_NAME);
      expect(tenant.isEmailVerified()).toBe(true);
      expect(tenant.getContactPhone()).toBe('+1234567890');
      expect(tenant.getAddress()).toBe('123 Main St');
      expect(tenant.getDescription()).toBe('A lovely place');
      expect(tenant.getLogoKey()).toBe(
        'tenants/65f1a1a2b3c4d5e6f7a8b9c0/logo/123.png',
      );
      expect(tenant.getTheme()).toEqual({ primary: '#1A73E8' });
      expect(tenant.getCreatedAt()).toEqual(createdAt);
      expect(tenant.getUpdatedAt()).toEqual(updatedAt);
    });

    it('TT-024: should preserve name without trimming', () => {
      const email = createValidEmail();
      const plan = createValidPlan();

      const tenant = Tenant.reconstitute({
        id: TenantId.createFromString(TENANT_ID),
        name: '  Untrimmed Name  ',
        ownerEmail: email,
        plan: plan,
        emailVerified: false,
        contactPhone: null,
        address: null,
        description: null,
        logoKey: null,
        theme: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(tenant.getName()).toBe('  Untrimmed Name  ');
    });

    it('TT-025: should allow past timestamps', () => {
      const pastDate = new Date('2020-01-01');
      const email = createValidEmail();
      const plan = createValidPlan();

      const tenant = Tenant.reconstitute({
        id: TenantId.createFromString(TENANT_ID),
        name: TENANT_NAME,
        ownerEmail: email,
        plan: plan,
        emailVerified: false,
        contactPhone: null,
        address: null,
        description: null,
        logoKey: null,
        theme: null,
        createdAt: pastDate,
        updatedAt: pastDate,
      });

      expect(tenant.getCreatedAt()).toEqual(pastDate);
    });

    it('TT-026: should allow future timestamps', () => {
      const futureDate = new Date('2050-12-31');
      const email = createValidEmail();
      const plan = createValidPlan();

      const tenant = Tenant.reconstitute({
        id: TenantId.createFromString(TENANT_ID),
        name: TENANT_NAME,
        ownerEmail: email,
        plan: plan,
        emailVerified: false,
        contactPhone: null,
        address: null,
        description: null,
        logoKey: null,
        theme: null,
        createdAt: futureDate,
        updatedAt: futureDate,
      });

      expect(tenant.getCreatedAt()).toEqual(futureDate);
    });

    it('TT-027: should preserve all profile fields', () => {
      const email = createValidEmail();
      const plan = createValidPlan();

      const tenant = Tenant.reconstitute({
        id: TenantId.createFromString(TENANT_ID),
        name: 'Test Tenant',
        ownerEmail: email,
        plan: plan,
        emailVerified: true,
        contactPhone: '555-1234',
        address: '456 Oak Ave',
        description: 'Test description',
        logoKey: 'tenants/abc/logo/1.png',
        theme: { primary: '#000000' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(tenant.getContactPhone()).toBe('555-1234');
      expect(tenant.getAddress()).toBe('456 Oak Ave');
      expect(tenant.getDescription()).toBe('Test description');
      expect(tenant.getLogoKey()).toBe('tenants/abc/logo/1.png');
      expect(tenant.getTheme()).toEqual({ primary: '#000000' });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  VERIFY EMAIL - COMPREHENSIVE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('verifyEmail - COMPREHENSIVE', () => {
    let tenant: Tenant;

    beforeEach(() => {
      const email = createValidEmail();
      const plan = createValidPlan();
      tenant = Tenant.create(TENANT_NAME, email, plan);
    });

    it('TT-028: should mark email as verified', () => {
      expect(tenant.isEmailVerified()).toBe(false);

      tenant.verifyEmail();

      expect(tenant.isEmailVerified()).toBe(true);
    });

    it('TT-029: should update updatedAt timestamp', () => {
      const before = new Date();

      tenant.verifyEmail();

      const after = new Date();
      expect(tenant.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(tenant.getUpdatedAt().getTime()).toBeLessThanOrEqual(
        after.getTime(),
      );
    });

    it('TT-030: should be able to call verifyEmail multiple times', () => {
      tenant.verifyEmail();
      expect(tenant.isEmailVerified()).toBe(true);

      tenant.verifyEmail();
      expect(tenant.isEmailVerified()).toBe(true);
    });

    it('TT-031: createdAt should not change after verifyEmail', () => {
      const originalCreatedAt = tenant.getCreatedAt();

      tenant.verifyEmail();

      expect(tenant.getCreatedAt()).toEqual(originalCreatedAt);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  CHANGE PLAN - COMPREHENSIVE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('changePlan - COMPREHENSIVE', () => {
    let tenant: Tenant;
    let starterPlan: PlanType;

    beforeEach(() => {
      const email = createValidEmail();
      starterPlan = PlanType.create('LYMON_ONE');
      tenant = Tenant.create(TENANT_NAME, email, starterPlan);
    });

    it('TT-032: should change plan to new plan', () => {
      const proplan = PlanType.create('LYMON_PLUS');

      tenant.changePlan(proplan);

      expect(tenant.getPlan()).toEqual(proplan);
    });

    it('TT-033: should update updatedAt timestamp', () => {
      const before = new Date();
      const proplan = PlanType.create('LYMON_PLUS');

      tenant.changePlan(proplan);

      const after = new Date();
      expect(tenant.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(tenant.getUpdatedAt().getTime()).toBeLessThanOrEqual(
        after.getTime(),
      );
    });

    it('TT-034: should allow changing plan multiple times', () => {
      const proplan = PlanType.create('LYMON_PLUS');
      const enterprisePlan = PlanType.create('LYMON_PRIME');

      tenant.changePlan(proplan);
      expect(tenant.getPlan()).toEqual(proplan);

      tenant.changePlan(enterprisePlan);
      expect(tenant.getPlan()).toEqual(enterprisePlan);
    });

    it('TT-035: should allow changing back to starter plan', () => {
      const proplan = PlanType.create('LYMON_PLUS');

      tenant.changePlan(proplan);
      expect(tenant.getPlan()).toEqual(proplan);

      tenant.changePlan(starterPlan);
      expect(tenant.getPlan()).toEqual(starterPlan);
    });

    it('TT-036: createdAt should not change after changePlan', () => {
      const originalCreatedAt = tenant.getCreatedAt();
      const proplan = PlanType.create('LYMON_PLUS');

      tenant.changePlan(proplan);

      expect(tenant.getCreatedAt()).toEqual(originalCreatedAt);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  UPDATE PROFILE - BASIC
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateProfile - UPDATE NAME (NESTED IF)', () => {
    let tenant: Tenant;

    beforeEach(() => {
      const email = createValidEmail();
      const plan = createValidPlan();
      tenant = Tenant.create(TENANT_NAME, email, plan);
    });

    it('TT-037: should update name only', () => {
      tenant.updateProfile('New Company Name');

      expect(tenant.getName()).toBe('New Company Name');
      expect(tenant.getContactPhone()).toBeNull();
      expect(tenant.getAddress()).toBeNull();
    });

    it('TT-038: should throw when updating to empty name', () => {
      expect(() => tenant.updateProfile('')).toThrow(
        'Tenant name cannot be empty',
      );
    });

    it('TT-039: should throw when updating to whitespace name', () => {
      expect(() => tenant.updateProfile('   ')).toThrow(
        'Tenant name cannot be empty',
      );
    });

    it('TT-040: should trim name when updating', () => {
      tenant.updateProfile('  Trimmed Company  ');

      expect(tenant.getName()).toBe('Trimmed Company');
    });

    it('TT-041: should not update name if undefined', () => {
      const originalName = tenant.getName();

      tenant.updateProfile(undefined);

      expect(tenant.getName()).toBe(originalName);
    });

    it('TT-042: should accept single character name', () => {
      tenant.updateProfile('X');

      expect(tenant.getName()).toBe('X');
    });

    it('TT-043: should accept very long name', () => {
      const longName = 'A'.repeat(500);

      tenant.updateProfile(longName);

      expect(tenant.getName()).toBe('A'.repeat(500));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  UPDATE PROFILE - CONTACT PHONE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateProfile - CONTACT PHONE', () => {
    let tenant: Tenant;

    beforeEach(() => {
      const email = createValidEmail();
      const plan = createValidPlan();
      tenant = Tenant.create(TENANT_NAME, email, plan);
    });

    it('TT-044: should update contact phone', () => {
      tenant.updateProfile(undefined, '+1234567890');

      expect(tenant.getContactPhone()).toBe('+1234567890');
    });

    it('TT-045: should allow setting contact phone to null', () => {
      tenant.updateProfile(undefined, '+1234567890');
      expect(tenant.getContactPhone()).toBe('+1234567890');

      tenant.updateProfile(undefined, null);

      expect(tenant.getContactPhone()).toBeNull();
    });

    it('TT-046: should allow empty string for contact phone', () => {
      tenant.updateProfile(undefined, '');

      expect(tenant.getContactPhone()).toBe('');
    });

    it('TT-047: should not update contact phone if undefined', () => {
      tenant.updateProfile(undefined, '+1234567890');
      const originalPhone = tenant.getContactPhone();

      tenant.updateProfile(undefined, undefined);

      expect(tenant.getContactPhone()).toBe(originalPhone);
    });

    it('TT-048: should accept very long phone number', () => {
      const longPhone = '+' + '1'.repeat(50);

      tenant.updateProfile(undefined, longPhone);

      expect(tenant.getContactPhone()).toBe(longPhone);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  UPDATE PROFILE - ADDRESS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateProfile - ADDRESS', () => {
    let tenant: Tenant;

    beforeEach(() => {
      const email = createValidEmail();
      const plan = createValidPlan();
      tenant = Tenant.create(TENANT_NAME, email, plan);
    });

    it('TT-049: should update address', () => {
      tenant.updateProfile(undefined, undefined, '123 Main Street');

      expect(tenant.getAddress()).toBe('123 Main Street');
    });

    it('TT-050: should allow setting address to null', () => {
      tenant.updateProfile(undefined, undefined, '123 Main Street');
      expect(tenant.getAddress()).toBe('123 Main Street');

      tenant.updateProfile(undefined, undefined, null);

      expect(tenant.getAddress()).toBeNull();
    });

    it('TT-051: should allow empty string for address', () => {
      tenant.updateProfile(undefined, undefined, '');

      expect(tenant.getAddress()).toBe('');
    });

    it('TT-052: should not update address if undefined', () => {
      tenant.updateProfile(undefined, undefined, '123 Main Street');
      const originalAddress = tenant.getAddress();

      tenant.updateProfile(undefined, undefined, undefined);

      expect(tenant.getAddress()).toBe(originalAddress);
    });

    it('TT-053: should accept very long address', () => {
      const longAddress = 'A'.repeat(500);

      tenant.updateProfile(undefined, undefined, longAddress);

      expect(tenant.getAddress()).toBe('A'.repeat(500));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  UPDATE PROFILE - WEBSITE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateProfile - DESCRIPTION', () => {
    let tenant: Tenant;

    beforeEach(() => {
      const email = createValidEmail();
      const plan = createValidPlan();
      tenant = Tenant.create(TENANT_NAME, email, plan);
    });

    it('TT-054: should update description', () => {
      tenant.updateProfile(undefined, undefined, undefined, 'A cozy hotel');

      expect(tenant.getDescription()).toBe('A cozy hotel');
    });

    it('TT-055: should allow setting description to null', () => {
      tenant.updateProfile(undefined, undefined, undefined, 'A cozy hotel');
      expect(tenant.getDescription()).toBe('A cozy hotel');

      tenant.updateProfile(undefined, undefined, undefined, null);

      expect(tenant.getDescription()).toBeNull();
    });

    it('TT-056: should allow empty string for description', () => {
      tenant.updateProfile(undefined, undefined, undefined, '');

      expect(tenant.getDescription()).toBe('');
    });

    it('TT-057: should not update description if undefined', () => {
      tenant.updateProfile(undefined, undefined, undefined, 'A cozy hotel');
      const originalDescription = tenant.getDescription();

      tenant.updateProfile(undefined, undefined, undefined, undefined);

      expect(tenant.getDescription()).toBe(originalDescription);
    });

    it('TT-058: should accept very long description', () => {
      const longDescription = 'A'.repeat(500);

      tenant.updateProfile(undefined, undefined, undefined, longDescription);

      expect(tenant.getDescription()).toBe(longDescription);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  UPDATE PROFILE - LOGO URL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateProfile - THEME', () => {
    let tenant: Tenant;

    beforeEach(() => {
      const email = createValidEmail();
      const plan = createValidPlan();
      tenant = Tenant.create(TENANT_NAME, email, plan);
    });

    it('TT-059: should update theme', () => {
      tenant.updateProfile(undefined, undefined, undefined, undefined, {
        primary: '#1A73E8',
        text: '#202124',
      });

      expect(tenant.getTheme()).toEqual({
        primary: '#1A73E8',
        text: '#202124',
      });
    });

    it('TT-060: should allow setting theme to null', () => {
      tenant.updateProfile(undefined, undefined, undefined, undefined, {
        primary: '#1A73E8',
      });
      expect(tenant.getTheme()).toEqual({ primary: '#1A73E8' });

      tenant.updateProfile(undefined, undefined, undefined, undefined, null);

      expect(tenant.getTheme()).toBeNull();
    });

    it('TT-061: should allow empty theme object', () => {
      tenant.updateProfile(undefined, undefined, undefined, undefined, {});

      expect(tenant.getTheme()).toEqual({});
    });

    it('TT-062: should not update theme if undefined', () => {
      tenant.updateProfile(undefined, undefined, undefined, undefined, {
        primary: '#1A73E8',
      });
      const originalTheme = tenant.getTheme();

      tenant.updateProfile(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(tenant.getTheme()).toBe(originalTheme);
    });
  });

  describe('updateProfile - logo key', () => {
    let tenant: Tenant;

    beforeEach(() => {
      const email = createValidEmail();
      const plan = createValidPlan();
      tenant = Tenant.create(TENANT_NAME, email, plan);
    });

    it('TT-063: should set the logo key', () => {
      tenant.updateProfile(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'abc/logos/1.png',
      );

      expect(tenant.getLogoKey()).toBe('abc/logos/1.png');
    });

    it('TT-063b: should allow clearing the logo key', () => {
      tenant.updateProfile(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'abc/logos/1.png',
      );
      tenant.updateProfile(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        null,
      );

      expect(tenant.getLogoKey()).toBeNull();
    });

    it('TT-063c: should leave the logo key untouched when omitted', () => {
      tenant.updateProfile(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'abc/logos/1.png',
      );
      tenant.updateProfile('Renamed Only');

      expect(tenant.getLogoKey()).toBe('abc/logos/1.png');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  UPDATE PROFILE - MULTIPLE FIELDS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateProfile - MULTIPLE FIELDS AT ONCE', () => {
    let tenant: Tenant;

    beforeEach(() => {
      const email = createValidEmail();
      const plan = createValidPlan();
      tenant = Tenant.create(TENANT_NAME, email, plan);
    });

    it('TT-064: should update all fields at once', () => {
      tenant.updateProfile('New Company', '+1111111111', '456 Oak Ave', 'A new company', {
        primary: '#123456',
      });

      expect(tenant.getName()).toBe('New Company');
      expect(tenant.getContactPhone()).toBe('+1111111111');
      expect(tenant.getAddress()).toBe('456 Oak Ave');
      expect(tenant.getDescription()).toBe('A new company');
      expect(tenant.getTheme()).toEqual({ primary: '#123456' });
    });

    it('TT-065: should update subset of fields', () => {
      const originalPhone = tenant.getContactPhone();
      const originalAddress = tenant.getAddress();

      tenant.updateProfile(
        'Updated Name',
        undefined,
        undefined,
        'New description',
      );

      expect(tenant.getName()).toBe('Updated Name');
      expect(tenant.getContactPhone()).toBe(originalPhone);
      expect(tenant.getAddress()).toBe(originalAddress);
      expect(tenant.getDescription()).toBe('New description');
    });

    it('TT-066: should clear optional fields', () => {
      tenant.updateProfile(undefined, '+1234567890', '123 Main', 'A description', {
        primary: '#123456',
      });

      tenant.updateProfile(undefined, null, null, null, null);

      expect(tenant.getContactPhone()).toBeNull();
      expect(tenant.getAddress()).toBeNull();
      expect(tenant.getDescription()).toBeNull();
      expect(tenant.getTheme()).toBeNull();
    });

    it('TT-067: should update updatedAt timestamp', () => {
      const before = new Date();
      tenant.updateProfile('New Name');
      const after = new Date();

      expect(tenant.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(tenant.getUpdatedAt().getTime()).toBeLessThanOrEqual(
        after.getTime(),
      );
    });

    it('TT-068: createdAt should not change', () => {
      const originalCreatedAt = tenant.getCreatedAt();

      tenant.updateProfile('New Name', '+1234567890', '123 Main St');

      expect(tenant.getCreatedAt()).toEqual(originalCreatedAt);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  INTEGRATION TESTS - COMPLEX SCENARIOS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INTEGRATION TESTS - Complex Scenarios', () => {
    it('TT-069: should handle full lifecycle', () => {
      const email = createValidEmail();
      const plan = createValidPlan();
      const tenant = Tenant.create('My Company', email, plan);

      expect(tenant.isEmailVerified()).toBe(false);

      tenant.verifyEmail();
      expect(tenant.isEmailVerified()).toBe(true);

      tenant.updateProfile(
        'My Company Renamed',
        '+1234567890',
        '123 Business Rd',
        'Renamed company',
        { primary: '#1A73E8' },
      );

      expect(tenant.getName()).toBe('My Company Renamed');
      expect(tenant.getContactPhone()).toBe('+1234567890');

      const proPlan = PlanType.create('LYMON_PLUS');
      tenant.changePlan(proPlan);
      expect(tenant.getPlan()).toEqual(proPlan);
    });

    it('TT-070: should maintain immutable properties', () => {
      const email = createValidEmail();
      const plan = createValidPlan();
      const tenant = Tenant.create('Company', email, plan);
      const originalEmail = tenant.getOwnerEmail();

      tenant.updateProfile('New Name');
      tenant.verifyEmail();
      const newPlan = PlanType.create('LYMON_PLUS');
      tenant.changePlan(newPlan);

      expect(tenant.getOwnerEmail()).toEqual(originalEmail);
    });

    it('TT-071: should maintain createdAt through all operations', () => {
      const email = createValidEmail();
      const plan = createValidPlan();
      const tenant = Tenant.create('Company', email, plan);
      const originalCreatedAt = tenant.getCreatedAt();

      tenant.verifyEmail();
      tenant.updateProfile('New Name');
      tenant.changePlan(PlanType.create('LYMON_PLUS'));

      expect(tenant.getCreatedAt()).toEqual(originalCreatedAt);
    });

    it('TT-072: should update updatedAt for each operation', (done) => {
      const email = createValidEmail();
      const plan = createValidPlan();
      const tenant = Tenant.create('Company', email, plan);
      const createdAt = tenant.getUpdatedAt();

      setTimeout(() => {
        tenant.verifyEmail();
        const afterVerify = tenant.getUpdatedAt();
        expect(afterVerify.getTime()).toBeGreaterThanOrEqual(
          createdAt.getTime(),
        );

        setTimeout(() => {
          tenant.updateProfile('New Name');
          const afterUpdate = tenant.getUpdatedAt();
          expect(afterUpdate.getTime()).toBeGreaterThanOrEqual(
            afterVerify.getTime(),
          );
          done();
        }, 10);
      }, 10);
    });

    it('TT-073: should handle rapid successive updates', () => {
      const email = createValidEmail();
      const plan = createValidPlan();
      const tenant = Tenant.create('Company', email, plan);

      tenant.updateProfile('Updated 1');
      tenant.updateProfile('Updated 2');
      tenant.updateProfile('Updated 3');
      tenant.verifyEmail();
      tenant.changePlan(PlanType.create('LYMON_PLUS'));

      expect(tenant.getName()).toBe('Updated 3');
      expect(tenant.isEmailVerified()).toBe(true);
    });

    it('TT-074: should support reverting profile changes', () => {
      const email = createValidEmail();
      const plan = createValidPlan();
      const tenant = Tenant.create('Original', email, plan);

      tenant.updateProfile('Changed');
      expect(tenant.getName()).toBe('Changed');

      tenant.updateProfile('Original');
      expect(tenant.getName()).toBe('Original');
    });

    it('TT-075: should support complex profile updates', () => {
      const email = createValidEmail();
      const plan = createValidPlan();
      const tenant = Tenant.create('Company', email, plan);

      tenant.updateProfile(
        undefined,
        '+1-555-0100',
        undefined,
        'A description',
        undefined,
      );

      expect(tenant.getName()).toBe('Company');
      expect(tenant.getContactPhone()).toBe('+1-555-0100');
      expect(tenant.getAddress()).toBeNull();
      expect(tenant.getDescription()).toBe('A description');
      expect(tenant.getTheme()).toBeNull();
    });
  });
});
