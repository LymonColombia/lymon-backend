import { Unit } from '@/domain/unit/entities/unit.entity';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { ExternalIds } from '@/domain/unit/value-objects/external-ids.vo';
import {
  BedTypeEnum,
  type Bedroom,
} from '@/domain/unit/value-objects/bed-type.vo';

describe('Unit Entity - COMPREHENSIVE COVERAGE', () => {
  const UNIT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c800000000';
  const TENANT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000';
  const PROPERTY_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000';

  // ─── Fixtures ────────────────────────────────────────────────────────────

  function createValidInput() {
    return {
      tenantId: TenantId.createFromString(TENANT_ID),
      propertyId: PropertyId.create(PROPERTY_ID),
      basicInfo: {
        name: 'Deluxe Suite',
        description: 'Ocean view suite with modern amenities',
      },
      inventoryConfig: {
        inventoryCount: 3,
      },
      capacityConfig: {
        maxGuests: 4,
        standardGuests: 2,
      },
      physicalFeatures: {
        bedrooms: [
          {
            roomName: 'Master Bedroom',
            beds: [{ type: BedTypeEnum.KING, count: 1 }],
          },
        ],
        bathroomsCount: 2,
        isShared: false,
      },
      pricingConfig: {
        pricePerNight: 250,
      },
      amenities: ['wifi', 'parking', 'kitchen'],
      externalIds: ExternalIds.create('airbnb-123', 'booking-456', 'vrbo-789'),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  UNIT.CREATE - BASIC TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Unit.create - BASIC HAPPY PATH', () => {
    it('UT-001: should create a unit with valid input', () => {
      const input = createValidInput();

      const unit = Unit.create(input);

      expect(unit).toBeDefined();
      expect(unit.getId()).toBeNull();
      expect(unit.getTenantId().toString()).toBe(TENANT_ID);
      expect(unit.getPropertyId().toString()).toBe(PROPERTY_ID);
    });

    it('UT-002: should trim name with leading/trailing spaces', () => {
      const input = createValidInput();
      input.basicInfo.name = '  Deluxe Suite  ';

      const unit = Unit.create(input);

      expect(unit.getName()).toBe('Deluxe Suite');
    });

    it('UT-003: should trim description with leading/trailing spaces', () => {
      const input = createValidInput();
      input.basicInfo.description = '  Ocean view  ';

      const unit = Unit.create(input);

      expect(unit.getDescription()).toBe('Ocean view');
    });

    it('UT-004: should set timestamps on creation', () => {
      const input = createValidInput();
      const beforeCreate = new Date();

      const unit = Unit.create(input);

      const afterCreate = new Date();
      expect(unit.getCreatedAt().getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime(),
      );
      expect(unit.getCreatedAt().getTime()).toBeLessThanOrEqual(
        afterCreate.getTime(),
      );
      expect(unit.getUpdatedAt()).toEqual(unit.getCreatedAt());
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  UNIT.CREATE - VALIDATION: NAME
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Unit.create - VALIDATION: NAME', () => {
    it('UT-005: should throw error when name is empty string', () => {
      const input = createValidInput();
      input.basicInfo.name = '';

      expect(() => Unit.create(input)).toThrow('Unit name cannot be empty');
    });

    it('UT-006: should throw error when name is only whitespace', () => {
      const input = createValidInput();
      input.basicInfo.name = '   ';

      expect(() => Unit.create(input)).toThrow('Unit name cannot be empty');
    });

    it('UT-007: should throw error when name is null-like (after trim)', () => {
      const input = createValidInput();
      input.basicInfo.name = '\t\n';

      expect(() => Unit.create(input)).toThrow('Unit name cannot be empty');
    });

    it('UT-008: should accept single character name', () => {
      const input = createValidInput();
      input.basicInfo.name = 'A';

      const unit = Unit.create(input);

      expect(unit.getName()).toBe('A');
    });

    it('UT-009: should accept very long name', () => {
      const input = createValidInput();
      input.basicInfo.name = 'A'.repeat(500);

      const unit = Unit.create(input);

      expect(unit.getName()).toBe('A'.repeat(500));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  UNIT.CREATE - VALIDATION: INVENTORY (NESTED IF)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Unit.create - VALIDATION: INVENTORY (NESTED IF)', () => {
    it('UT-010: should throw when inventoryCount is 0', () => {
      const input = createValidInput();
      input.inventoryConfig.inventoryCount = 0;

      expect(() => Unit.create(input)).toThrow(
        'Inventory count must be at least 1',
      );
    });

    it('UT-011: should throw when inventoryCount is negative', () => {
      const input = createValidInput();
      input.inventoryConfig.inventoryCount = -5;

      expect(() => Unit.create(input)).toThrow(
        'Inventory count must be at least 1',
      );
    });

    it('UT-012: should throw when inventoryCount is very negative', () => {
      const input = createValidInput();
      input.inventoryConfig.inventoryCount = -999999;

      expect(() => Unit.create(input)).toThrow(
        'Inventory count must be at least 1',
      );
    });

    it('UT-013: should accept inventoryCount of 1', () => {
      const input = createValidInput();
      input.inventoryConfig.inventoryCount = 1;

      const unit = Unit.create(input);

      expect(unit.getInventoryCount()).toBe(1);
    });

    it('UT-014: should accept large inventoryCount', () => {
      const input = createValidInput();
      input.inventoryConfig.inventoryCount = 999999;

      const unit = Unit.create(input);

      expect(unit.getInventoryCount()).toBe(999999);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  UNIT.CREATE - VALIDATION: MAX GUESTS (NESTED IF)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Unit.create - VALIDATION: MAX GUESTS (NESTED IF)', () => {
    it('UT-015: should throw when maxGuests is 0', () => {
      const input = createValidInput();
      input.capacityConfig.maxGuests = 0;

      expect(() => Unit.create(input)).toThrow('Max guests must be at least 1');
    });

    it('UT-016: should throw when maxGuests is negative', () => {
      const input = createValidInput();
      input.capacityConfig.maxGuests = -1;

      expect(() => Unit.create(input)).toThrow('Max guests must be at least 1');
    });

    it('UT-017: should accept maxGuests of 1', () => {
      const input = createValidInput();
      input.capacityConfig.maxGuests = 1;
      input.capacityConfig.standardGuests = 1;

      const unit = Unit.create(input);

      expect(unit.getMaxGuests()).toBe(1);
    });

    it('UT-018: should accept large maxGuests', () => {
      const input = createValidInput();
      input.capacityConfig.maxGuests = 1000;
      input.capacityConfig.standardGuests = 500;

      const unit = Unit.create(input);

      expect(unit.getMaxGuests()).toBe(1000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  UNIT.CREATE - VALIDATION: STANDARD GUESTS (NESTED IF - COMPLEX)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Unit.create - VALIDATION: STANDARD GUESTS (NESTED IF - COMPLEX)', () => {
    it('UT-019: should throw when standardGuests is 0', () => {
      const input = createValidInput();
      input.capacityConfig.standardGuests = 0;

      expect(() => Unit.create(input)).toThrow(
        'Standard guests must be between 1 and max guests',
      );
    });

    it('UT-020: should throw when standardGuests is negative', () => {
      const input = createValidInput();
      input.capacityConfig.standardGuests = -5;

      expect(() => Unit.create(input)).toThrow(
        'Standard guests must be between 1 and max guests',
      );
    });

    it('UT-021: should throw when standardGuests > maxGuests', () => {
      const input = createValidInput();
      input.capacityConfig.maxGuests = 2;
      input.capacityConfig.standardGuests = 5;

      expect(() => Unit.create(input)).toThrow(
        'Standard guests must be between 1 and max guests',
      );
    });

    it('UT-022: should throw when standardGuests = maxGuests + 1', () => {
      const input = createValidInput();
      input.capacityConfig.maxGuests = 4;
      input.capacityConfig.standardGuests = 5;

      expect(() => Unit.create(input)).toThrow(
        'Standard guests must be between 1 and max guests',
      );
    });

    it('UT-023: should accept when standardGuests = maxGuests (boundary)', () => {
      const input = createValidInput();
      input.capacityConfig.maxGuests = 4;
      input.capacityConfig.standardGuests = 4;

      const unit = Unit.create(input);

      expect(unit.getStandardGuests()).toBe(4);
    });

    it('UT-024: should accept when standardGuests = 1 and maxGuests = 1', () => {
      const input = createValidInput();
      input.capacityConfig.maxGuests = 1;
      input.capacityConfig.standardGuests = 1;

      const unit = Unit.create(input);

      expect(unit.getStandardGuests()).toBe(1);
    });

    it('UT-025: should accept any value between 1 and maxGuests', () => {
      const input = createValidInput();
      input.capacityConfig.maxGuests = 10;
      input.capacityConfig.standardGuests = 5;

      const unit = Unit.create(input);

      expect(unit.getStandardGuests()).toBe(5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  UNIT.CREATE - VALIDATION: PRICE (NESTED IF)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Unit.create - VALIDATION: PRICE (NESTED IF)', () => {
    it('UT-026: should throw when pricePerNight is negative', () => {
      const input = createValidInput();
      input.pricingConfig.pricePerNight = -100;

      expect(() => Unit.create(input)).toThrow(
        'Price per night cannot be negative',
      );
    });

    it('UT-027: should throw when pricePerNight is very negative', () => {
      const input = createValidInput();
      input.pricingConfig.pricePerNight = -999999.99;

      expect(() => Unit.create(input)).toThrow(
        'Price per night cannot be negative',
      );
    });

    it('UT-028: should accept pricePerNight of 0', () => {
      const input = createValidInput();
      input.pricingConfig.pricePerNight = 0;

      const unit = Unit.create(input);

      expect(unit.getPricePerNight()).toBe(0);
    });

    it('UT-029: should accept decimal pricePerNight', () => {
      const input = createValidInput();
      input.pricingConfig.pricePerNight = 99.99;

      const unit = Unit.create(input);

      expect(unit.getPricePerNight()).toBe(99.99);
    });

    it('UT-030: should accept very large pricePerNight', () => {
      const input = createValidInput();
      input.pricingConfig.pricePerNight = 999999.99;

      const unit = Unit.create(input);

      expect(unit.getPricePerNight()).toBe(999999.99);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  UNIT.CREATE - VALIDATION: MULTIPLE FAILURES (NESTED IF COMBINATIONS)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Unit.create - VALIDATION: MULTIPLE FAILURES', () => {
    it('UT-031: should fail on name validation first (empty name)', () => {
      const input = createValidInput();
      input.basicInfo.name = '';
      input.inventoryConfig.inventoryCount = 0;

      expect(() => Unit.create(input)).toThrow('Unit name cannot be empty');
    });

    it('UT-032: should fail on inventory if name is valid', () => {
      const input = createValidInput();
      input.inventoryConfig.inventoryCount = 0;

      expect(() => Unit.create(input)).toThrow(
        'Inventory count must be at least 1',
      );
    });

    it('UT-033: should fail on maxGuests if name and inventory are valid', () => {
      const input = createValidInput();
      input.capacityConfig.maxGuests = 0;

      expect(() => Unit.create(input)).toThrow('Max guests must be at least 1');
    });

    it('UT-034: should fail on standardGuests if all previous are valid', () => {
      const input = createValidInput();
      input.capacityConfig.standardGuests = 10;
      input.capacityConfig.maxGuests = 5;

      expect(() => Unit.create(input)).toThrow(
        'Standard guests must be between 1 and max guests',
      );
    });

    it('UT-035: should fail on price if all capacity checks pass', () => {
      const input = createValidInput();
      input.pricingConfig.pricePerNight = -50;

      expect(() => Unit.create(input)).toThrow(
        'Price per night cannot be negative',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  ALL GETTERS - COMPREHENSIVE COVERAGE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Getter Methods - COMPREHENSIVE', () => {
    let unit: Unit;

    beforeEach(() => {
      const input = createValidInput();
      unit = Unit.create(input);
    });

    it('UT-036: getId returns null for newly created unit', () => {
      expect(unit.getId()).toBeNull();
    });

    it('UT-037: getTenantId returns correct TenantId', () => {
      const tenantId = unit.getTenantId();
      expect(tenantId).toBeDefined();
      expect(tenantId.toString()).toBe(TENANT_ID);
    });

    it('UT-038: getPropertyId returns correct PropertyId', () => {
      const propertyId = unit.getPropertyId();
      expect(propertyId).toBeDefined();
      expect(propertyId.toString()).toBe(PROPERTY_ID);
    });

    it('UT-039: getName returns correct name', () => {
      expect(unit.getName()).toBe('Deluxe Suite');
    });

    it('UT-040: getDescription returns correct description', () => {
      expect(unit.getDescription()).toBe(
        'Ocean view suite with modern amenities',
      );
    });

    it('UT-041: getInventoryCount returns correct count', () => {
      expect(unit.getInventoryCount()).toBe(3);
    });

    it('UT-042: getMaxGuests returns correct max', () => {
      expect(unit.getMaxGuests()).toBe(4);
    });

    it('UT-043: getStandardGuests returns correct standard', () => {
      expect(unit.getStandardGuests()).toBe(2);
    });

    it('UT-044: getBedrooms returns correct bedrooms array', () => {
      const bedrooms = unit.getBedrooms();
      expect(Array.isArray(bedrooms)).toBe(true);
      expect(bedrooms).toHaveLength(1);
      expect(bedrooms[0].roomName).toBe('Master Bedroom');
    });

    it('UT-045: getBathroomsCount returns correct count', () => {
      expect(unit.getBathroomsCount()).toBe(2);
    });

    it('UT-046: getIsShared returns correct boolean', () => {
      expect(unit.getIsShared()).toBe(false);
    });

    it('UT-047: getAmenities returns correct amenities array', () => {
      const amenities = unit.getAmenities();
      expect(Array.isArray(amenities)).toBe(true);
      expect(amenities).toEqual(['wifi', 'parking', 'kitchen']);
    });

    it('UT-048: getPricePerNight returns correct price', () => {
      expect(unit.getPricePerNight()).toBe(250);
    });

    it('UT-049: getExternalIds returns defined object', () => {
      const externalIds = unit.getExternalIds();
      expect(externalIds).toBeDefined();
    });

    it('UT-050: getCreatedAt returns valid date', () => {
      const createdAt = unit.getCreatedAt();
      expect(createdAt instanceof Date).toBe(true);
      expect(createdAt.getTime()).toBeGreaterThan(0);
    });

    it('UT-051: getUpdatedAt returns valid date', () => {
      const updatedAt = unit.getUpdatedAt();
      expect(updatedAt instanceof Date).toBe(true);
      expect(updatedAt.getTime()).toBeGreaterThan(0);
    });

    it('UT-052: createdAt and updatedAt are initially equal', () => {
      expect(unit.getUpdatedAt()).toEqual(unit.getCreatedAt());
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  UNIT.RECONSTITUTE - COMPREHENSIVE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Unit.reconstitute - COMPREHENSIVE', () => {
    it('UT-053: should reconstitute with all fields', () => {
      const createdAt = new Date('2030-01-01');
      const updatedAt = new Date('2030-02-01');
      const input = createValidInput();

      const unit = Unit.reconstitute({
        ...input,
        id: UnitId.create(UNIT_ID),
        timestamps: {
          createdAt,
          updatedAt,
        },
      });

      expect(unit.getId()?.toString()).toBe(UNIT_ID);
      expect(unit.getCreatedAt()).toEqual(createdAt);
      expect(unit.getUpdatedAt()).toEqual(updatedAt);
    });

    it('UT-054: should preserve original name/description without trimming', () => {
      const input = createValidInput();

      const unit = Unit.reconstitute({
        ...input,
        id: UnitId.create(UNIT_ID),
        basicInfo: {
          name: '  Untrimmed  ',
          description: '  Description  ',
        },
        timestamps: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      expect(unit.getName()).toBe('  Untrimmed  ');
      expect(unit.getDescription()).toBe('  Description  ');
    });

    it('UT-055: should allow past timestamps', () => {
      const pastDate = new Date('2020-01-01');
      const input = createValidInput();

      const unit = Unit.reconstitute({
        ...input,
        id: UnitId.create(UNIT_ID),
        timestamps: {
          createdAt: pastDate,
          updatedAt: pastDate,
        },
      });

      expect(unit.getCreatedAt()).toEqual(pastDate);
    });

    it('UT-056: should allow future timestamps', () => {
      const futureDate = new Date('2050-12-31');
      const input = createValidInput();

      const unit = Unit.reconstitute({
        ...input,
        id: UnitId.create(UNIT_ID),
        timestamps: {
          createdAt: futureDate,
          updatedAt: futureDate,
        },
      });

      expect(unit.getCreatedAt()).toEqual(futureDate);
    });

    it('UT-057: should preserve 0 inventory', () => {
      const input = createValidInput();
      input.inventoryConfig.inventoryCount = 0;

      const unit = Unit.reconstitute({
        ...input,
        id: UnitId.create(UNIT_ID),
        timestamps: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      expect(unit.getInventoryCount()).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  UPDATE DETAILS - COMPREHENSIVE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateDetails - COMPREHENSIVE', () => {
    let unit: Unit;

    beforeEach(() => {
      const input = createValidInput();
      unit = Unit.create(input);
    });

    it('UT-058: should update both name and description', () => {
      unit.updateDetails('New Suite', 'New description');

      expect(unit.getName()).toBe('New Suite');
      expect(unit.getDescription()).toBe('New description');
    });

    it('UT-059: should update name and clear description if description is empty', () => {
      unit.updateDetails('New Suite', '');

      expect(unit.getName()).toBe('New Suite');
      expect(unit.getDescription()).toBe('');
    });

    it('UT-060: should not update name if it is empty/whitespace', () => {
      const originalName = unit.getName();

      unit.updateDetails('', 'New description');

      expect(unit.getName()).toBe(originalName);
      expect(unit.getDescription()).toBe('New description');
    });

    it('UT-061: should not update name if it is only whitespace', () => {
      const originalName = unit.getName();

      unit.updateDetails('   ', 'New description');

      expect(unit.getName()).toBe(originalName);
    });

    it('UT-062: should trim name when updating', () => {
      unit.updateDetails('  New Suite  ', 'Description');

      expect(unit.getName()).toBe('New Suite');
    });

    it('UT-063: should trim description when updating', () => {
      unit.updateDetails('Suite', '  Description  ');

      expect(unit.getDescription()).toBe('Description');
    });

    it('UT-064: should update updatedAt timestamp', () => {
      const before = new Date();
      unit.updateDetails('New Suite', 'New description');
      const after = new Date();

      expect(unit.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(unit.getUpdatedAt().getTime()).toBeLessThanOrEqual(
        after.getTime(),
      );
    });

    it('UT-065: should clear both when both are empty strings', () => {
      unit.updateDetails('', '');

      expect(unit.getName()).toBe('Deluxe Suite');
      expect(unit.getDescription()).toBe('');
    });

    it('UT-066: should accept long strings', () => {
      const longName = 'A'.repeat(500);
      const longDesc = 'B'.repeat(1000);

      unit.updateDetails(longName, longDesc);

      expect(unit.getName()).toBe(longName);
      expect(unit.getDescription()).toBe(longDesc);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  UPDATE CAPACITY - COMPREHENSIVE TESTS (NESTED IF)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateCapacity - COMPREHENSIVE (NESTED IF)', () => {
    let unit: Unit;

    beforeEach(() => {
      const input = createValidInput();
      unit = Unit.create(input);
    });

    it('UT-067: should update both maxGuests and standardGuests', () => {
      unit.updateCapacity(5, 3);

      expect(unit.getMaxGuests()).toBe(5);
      expect(unit.getStandardGuests()).toBe(3);
    });

    it('UT-068: should throw when maxGuests is 0', () => {
      expect(() => unit.updateCapacity(0, 2)).toThrow(
        'Max guests must be at least 1',
      );
    });

    it('UT-069: should throw when maxGuests is negative', () => {
      expect(() => unit.updateCapacity(-1, 2)).toThrow(
        'Max guests must be at least 1',
      );
    });

    it('UT-070: should throw when standardGuests is 0', () => {
      expect(() => unit.updateCapacity(4, 0)).toThrow(
        'Standard guests must be between 1 and max guests',
      );
    });

    it('UT-071: should throw when standardGuests > maxGuests', () => {
      expect(() => unit.updateCapacity(2, 5)).toThrow(
        'Standard guests must be between 1 and max guests',
      );
    });

    it('UT-072: should accept when standardGuests = maxGuests', () => {
      unit.updateCapacity(5, 5);

      expect(unit.getMaxGuests()).toBe(5);
      expect(unit.getStandardGuests()).toBe(5);
    });

    it('UT-073: should accept when standardGuests = 1, maxGuests = 1', () => {
      unit.updateCapacity(1, 1);

      expect(unit.getMaxGuests()).toBe(1);
      expect(unit.getStandardGuests()).toBe(1);
    });

    it('UT-074: should update updatedAt timestamp', () => {
      const before = new Date();
      unit.updateCapacity(5, 3);
      const after = new Date();

      expect(unit.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(unit.getUpdatedAt().getTime()).toBeLessThanOrEqual(
        after.getTime(),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  UPDATE INVENTORY COUNT - COMPREHENSIVE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateInventoryCount - COMPREHENSIVE', () => {
    let unit: Unit;

    beforeEach(() => {
      const input = createValidInput();
      unit = Unit.create(input);
    });

    it('UT-075: should update inventoryCount', () => {
      unit.updateInventoryCount(10);

      expect(unit.getInventoryCount()).toBe(10);
    });

    it('UT-076: should throw when inventoryCount is 0', () => {
      expect(() => unit.updateInventoryCount(0)).toThrow(
        'Inventory count must be at least 1',
      );
    });

    it('UT-077: should throw when inventoryCount is negative', () => {
      expect(() => unit.updateInventoryCount(-5)).toThrow(
        'Inventory count must be at least 1',
      );
    });

    it('UT-078: should accept 1 as inventoryCount', () => {
      unit.updateInventoryCount(1);

      expect(unit.getInventoryCount()).toBe(1);
    });

    it('UT-079: should accept large inventoryCount', () => {
      unit.updateInventoryCount(999999);

      expect(unit.getInventoryCount()).toBe(999999);
    });

    it('UT-080: should update updatedAt timestamp', () => {
      const before = new Date();
      unit.updateInventoryCount(5);

      expect(unit.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  UPDATE BEDROOMS - COMPREHENSIVE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateBedrooms - COMPREHENSIVE', () => {
    let unit: Unit;

    beforeEach(() => {
      const input = createValidInput();
      unit = Unit.create(input);
    });

    it('UT-081: should update bedrooms with multiple rooms', () => {
      const newBedrooms: Bedroom[] = [
        {
          roomName: 'Master',
          beds: [{ type: BedTypeEnum.KING, count: 1 }],
        },
        {
          roomName: 'Guest',
          beds: [{ type: BedTypeEnum.QUEEN, count: 2 }],
        },
      ];

      unit.updateBedrooms(newBedrooms);

      expect(unit.getBedrooms()).toHaveLength(2);
      expect(unit.getBedrooms()).toEqual(newBedrooms);
    });

    it('UT-082: should accept empty bedrooms array', () => {
      unit.updateBedrooms([]);

      expect(unit.getBedrooms()).toHaveLength(0);
    });

    it('UT-083: should accept single bedroom', () => {
      const bedrooms: Bedroom[] = [
        {
          roomName: 'Only Room',
          beds: [{ type: BedTypeEnum.SINGLE, count: 1 }],
        },
      ];

      unit.updateBedrooms(bedrooms);

      expect(unit.getBedrooms()).toHaveLength(1);
    });

    it('UT-084: should update updatedAt timestamp', () => {
      const before = new Date();
      unit.updateBedrooms([]);

      expect(unit.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
    });

    it('UT-085: should support all bed types', () => {
      const bedrooms: Bedroom[] = [
        {
          roomName: 'All Types',
          beds: [
            { type: BedTypeEnum.KING, count: 1 },
            { type: BedTypeEnum.QUEEN, count: 1 },
            { type: BedTypeEnum.DOUBLE, count: 1 },
            { type: BedTypeEnum.SINGLE, count: 2 },
            { type: BedTypeEnum.SOFA_BED, count: 1 },
          ],
        },
      ];

      unit.updateBedrooms(bedrooms);

      expect(unit.getBedrooms()[0].beds).toHaveLength(5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  UPDATE BATHROOMS COUNT - COMPREHENSIVE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateBathroomsCount - COMPREHENSIVE', () => {
    let unit: Unit;

    beforeEach(() => {
      const input = createValidInput();
      unit = Unit.create(input);
    });

    it('UT-086: should update bathrooms count', () => {
      unit.updateBathroomsCount(3);

      expect(unit.getBathroomsCount()).toBe(3);
    });

    it('UT-087: should throw when bathroomsCount is negative', () => {
      expect(() => unit.updateBathroomsCount(-1)).toThrow(
        'Bathrooms count cannot be negative',
      );
    });

    it('UT-088: should accept 0 bathrooms', () => {
      unit.updateBathroomsCount(0);

      expect(unit.getBathroomsCount()).toBe(0);
    });

    it('UT-089: should accept large bathrooms count', () => {
      unit.updateBathroomsCount(100);

      expect(unit.getBathroomsCount()).toBe(100);
    });

    it('UT-090: should update updatedAt timestamp', () => {
      const before = new Date();
      unit.updateBathroomsCount(1);

      expect(unit.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  UPDATE SHARED - COMPREHENSIVE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateShared - COMPREHENSIVE', () => {
    let unit: Unit;

    beforeEach(() => {
      const input = createValidInput();
      unit = Unit.create(input);
    });

    it('UT-091: should update shared to true', () => {
      unit.updateShared(true);

      expect(unit.getIsShared()).toBe(true);
    });

    it('UT-092: should update shared to false', () => {
      const editableUnit = createValidInput();
      editableUnit.physicalFeatures.isShared = true;
      const sharedUnit = Unit.create(editableUnit);

      sharedUnit.updateShared(false);

      expect(sharedUnit.getIsShared()).toBe(false);
    });

    it('UT-093: should toggle shared status', () => {
      expect(unit.getIsShared()).toBe(false);

      unit.updateShared(true);
      expect(unit.getIsShared()).toBe(true);

      unit.updateShared(false);
      expect(unit.getIsShared()).toBe(false);
    });

    it('UT-094: should update updatedAt timestamp', () => {
      const before = new Date();
      unit.updateShared(true);

      expect(unit.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  UPDATE PRICE - COMPREHENSIVE TESTS (NESTED IF)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updatePrice - COMPREHENSIVE (NESTED IF)', () => {
    let unit: Unit;

    beforeEach(() => {
      const input = createValidInput();
      unit = Unit.create(input);
    });

    it('UT-095: should update price', () => {
      unit.updatePrice(350);

      expect(unit.getPricePerNight()).toBe(350);
    });

    it('UT-096: should throw when price is negative', () => {
      expect(() => unit.updatePrice(-50)).toThrow(
        'Price per night cannot be negative',
      );
    });

    it('UT-097: should throw when price is slightly negative', () => {
      expect(() => unit.updatePrice(-0.01)).toThrow(
        'Price per night cannot be negative',
      );
    });

    it('UT-098: should accept 0 price', () => {
      unit.updatePrice(0);

      expect(unit.getPricePerNight()).toBe(0);
    });

    it('UT-099: should accept decimal price', () => {
      unit.updatePrice(99.99);

      expect(unit.getPricePerNight()).toBe(99.99);
    });

    it('UT-100: should accept very large price', () => {
      unit.updatePrice(999999.99);

      expect(unit.getPricePerNight()).toBe(999999.99);
    });

    it('UT-101: should update updatedAt timestamp', () => {
      const before = new Date();
      unit.updatePrice(300);

      expect(unit.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  UPDATE AMENITIES - COMPREHENSIVE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateAmenities - COMPREHENSIVE', () => {
    let unit: Unit;

    beforeEach(() => {
      const input = createValidInput();
      unit = Unit.create(input);
    });

    it('UT-102: should update amenities with new list', () => {
      const newAmenities = ['pool', 'gym', 'spa'];

      unit.updateAmenities(newAmenities);

      expect(unit.getAmenities()).toEqual(newAmenities);
    });

    it('UT-103: should clear amenities with empty array', () => {
      unit.updateAmenities([]);

      expect(unit.getAmenities()).toEqual([]);
    });

    it('UT-104: should accept single amenity', () => {
      unit.updateAmenities(['wifi']);

      expect(unit.getAmenities()).toEqual(['wifi']);
    });

    it('UT-105: should accept many amenities', () => {
      const manyAmenities = Array.from(
        { length: 100 },
        (_, i) => `amenity-${i}`,
      );

      unit.updateAmenities(manyAmenities);

      expect(unit.getAmenities()).toHaveLength(100);
    });

    it('UT-106: should update updatedAt timestamp', () => {
      const before = new Date();
      unit.updateAmenities(['balcony']);

      expect(unit.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  UPDATE EXTERNAL IDS - COMPREHENSIVE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateExternalIds - COMPREHENSIVE', () => {
    let unit: Unit;

    beforeEach(() => {
      const input = createValidInput();
      unit = Unit.create(input);
    });

    it('UT-107: should update external IDs', () => {
      const newExternalIds = ExternalIds.create(
        'new-airbnb',
        'new-booking',
        'new-vrbo',
      );

      unit.updateExternalIds(newExternalIds);

      expect(unit.getExternalIds()).toEqual(newExternalIds);
    });

    it('UT-108: should accept empty external IDs', () => {
      const emptyExternalIds = ExternalIds.create();

      unit.updateExternalIds(emptyExternalIds);

      expect(unit.getExternalIds()).toEqual(emptyExternalIds);
    });

    it('UT-109: should update updatedAt timestamp', () => {
      const before = new Date();
      unit.updateExternalIds(ExternalIds.create());

      expect(unit.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ●  INTEGRATION TESTS - COMPLEX SCENARIOS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INTEGRATION TESTS - Complex Scenarios', () => {
    it('UT-110: should handle multiple sequential updates', () => {
      const input = createValidInput();
      const unit = Unit.create(input);

      unit.updateDetails('New Name', 'New Description');
      unit.updateCapacity(6, 4);
      unit.updatePrice(400);
      unit.updateAmenities(['wifi', 'pool']);
      unit.updateShared(true);

      expect(unit.getName()).toBe('New Name');
      expect(unit.getDescription()).toBe('New Description');
      expect(unit.getMaxGuests()).toBe(6);
      expect(unit.getStandardGuests()).toBe(4);
      expect(unit.getPricePerNight()).toBe(400);
      expect(unit.getAmenities()).toEqual(['wifi', 'pool']);
      expect(unit.getIsShared()).toBe(true);
    });

    it('UT-111: should maintain immutable IDs through updates', () => {
      const input = createValidInput();
      const unit = Unit.create(input);
      const originalTenantId = unit.getTenantId();
      const originalPropertyId = unit.getPropertyId();

      unit.updateDetails('New Name', 'New Description');
      unit.updatePrice(500);

      expect(unit.getTenantId()).toEqual(originalTenantId);
      expect(unit.getPropertyId()).toEqual(originalPropertyId);
    });

    it('UT-112: should ensure createdAt never changes', () => {
      const input = createValidInput();
      const unit = Unit.create(input);
      const originalCreatedAt = unit.getCreatedAt();

      unit.updateDetails('New Name', 'New Description');
      unit.updatePrice(500);
      unit.updateCapacity(5, 3);

      expect(unit.getCreatedAt()).toEqual(originalCreatedAt);
    });

    it('UT-113: should update updatedAt for each update operation', () => {
      const input = createValidInput();
      const unit = Unit.create(input);

      const before1 = new Date();
      unit.updatePrice(300);
      const secondUpdatedAt = unit.getUpdatedAt();

      expect(secondUpdatedAt.getTime()).toBeGreaterThanOrEqual(
        before1.getTime(),
      );
    });

    it('UT-114: should allow reverting to default values', () => {
      const input = createValidInput();
      const unit = Unit.create(input);

      unit.updateShared(true);
      expect(unit.getIsShared()).toBe(true);

      unit.updateShared(false);
      expect(unit.getIsShared()).toBe(false);
    });

    it('UT-115: should allow extreme boundary updates', () => {
      const input = createValidInput();
      const unit = Unit.create(input);

      // Set extreme values
      unit.updateInventoryCount(1);
      unit.updateCapacity(1, 1);
      unit.updatePrice(0);
      unit.updateBathroomsCount(0);
      unit.updateBedrooms([]);

      expect(unit.getInventoryCount()).toBe(1);
      expect(unit.getMaxGuests()).toBe(1);
      expect(unit.getPricePerNight()).toBe(0);
      expect(unit.getBathroomsCount()).toBe(0);
      expect(unit.getBedrooms()).toHaveLength(0);
    });
  });
});
