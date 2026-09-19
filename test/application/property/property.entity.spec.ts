import { Property } from '../../../src/domain/property/entities/property.entity';
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
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

describe('Property Entity', () => {
  const tenantId = TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000');
  const propertyType = PropertyType.create(PropertyTypeEnum.CASA);
  const location = Location.create(4.6097, -74.0817);
  const cancellationPolicy = CancellationPolicy.create(
    CancellationPolicyEnum.FLEXIBLE,
  );

  const validProps = {
    tenantId,
    name: 'Casa del lago',
    description: 'Una hermosa casa',
    propertyType,
    address: 'Calle 123',
    city: 'Bogotá',
    state: 'Cundinamarca',
    country: 'Colombia',
    zipCode: '110111',
    location,
    checkInTime: '15:00',
    checkOutTime: '11:00',
    cancellationPolicy,
    hostPhone: '+573001234567',
    hostEmail: 'host@example.com',
  };

  describe('create', () => {
    it('should create a property with valid props', () => {
      const property = Property.create(validProps);

      expect(property).toBeDefined();
      expect(property.getName()).toBe('Casa del lago');
      expect(property.getAddress()).toBe('Calle 123');
      expect(property.getId()).toBeNull();
    });

    it('should throw error if name is empty string', () => {
      const props = { ...validProps, name: '' };
      expect(() => Property.create(props)).toThrow(
        'Property name cannot be empty',
      );
    });

    it('should throw error if name is only whitespace', () => {
      const props = { ...validProps, name: '   ' };
      expect(() => Property.create(props)).toThrow(
        'Property name cannot be empty',
      );
    });

    it('should throw error if name is null or falsy', () => {
      const props = { ...validProps, name: '' };
      expect(() => Property.create(props)).toThrow(
        'Property name cannot be empty',
      );
    });

    it('should throw error if address is empty string', () => {
      const props = { ...validProps, address: '' };
      expect(() => Property.create(props)).toThrow(
        'Property address cannot be empty',
      );
    });

    it('should throw error if address is only whitespace', () => {
      const props = { ...validProps, address: '   ' };
      expect(() => Property.create(props)).toThrow(
        'Property address cannot be empty',
      );
    });

    it('should trim whitespace from input props', () => {
      const props = {
        ...validProps,
        name: '  Casa del lago  ',
        description: '  Una hermosa casa  ',
        address: '  Calle 123  ',
        city: '  Bogotá  ',
        state: '  Cundinamarca  ',
        country: '  Colombia  ',
        zipCode: '  110111  ',
      };

      const property = Property.create(props);

      expect(property.getName()).toBe('Casa del lago');
      expect(property.getDescription()).toBe('Una hermosa casa');
      expect(property.getAddress()).toBe('Calle 123');
      expect(property.getCity()).toBe('Bogotá');
      expect(property.getState()).toBe('Cundinamarca');
      expect(property.getCountry()).toBe('Colombia');
      expect(property.getZipCode()).toBe('110111');
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute a property with all data', () => {
      const id = PropertyId.create('65f1a1a2-b3c4-d5e6-f7a8-b9c100000000');
      const createdAt = new Date('2025-01-01');
      const updatedAt = new Date('2025-03-24');

      const property = Property.reconstitute({
        id,
        tenantId,
        name: 'Casa del lago',
        description: 'Una hermosa casa',
        propertyType,
        address: 'Calle 123',
        city: 'Bogotá',
        state: 'Cundinamarca',
        country: 'Colombia',
        zipCode: '110111',
        location,
        checkInTime: '15:00',
        checkOutTime: '11:00',
        cancellationPolicy,
        hostPhone: '+573001234567',
        hostEmail: 'host@example.com',
        createdAt,
        updatedAt,
        deletedAt: null,
      });

      expect(property.getId()).toEqual(id);
      expect(property.getTenantId()).toEqual(tenantId);
      expect(property.getName()).toBe('Casa del lago');
      expect(property.getDeletedAt()).toBeNull();
    });

    it('should reconstitute with deletedAt as undefined and default to null', () => {
      const id = PropertyId.create('65f1a1a2-b3c4-d5e6-f7a8-b9c100000000');
      const createdAt = new Date('2025-01-01');
      const updatedAt = new Date('2025-03-24');

      const property = Property.reconstitute({
        id,
        tenantId,
        name: 'Casa del lago',
        description: 'Una hermosa casa',
        propertyType,
        address: 'Calle 123',
        city: 'Bogotá',
        state: 'Cundinamarca',
        country: 'Colombia',
        zipCode: '110111',
        location,
        checkInTime: '15:00',
        checkOutTime: '11:00',
        cancellationPolicy,
        hostPhone: '+573001234567',
        hostEmail: 'host@example.com',
        createdAt,
        updatedAt,
      });

      expect(property.getDeletedAt()).toBeNull();
    });

    it('should reconstitute with deletedAt as a Date', () => {
      const id = PropertyId.create('65f1a1a2-b3c4-d5e6-f7a8-b9c100000000');
      const createdAt = new Date('2025-01-01');
      const updatedAt = new Date('2025-03-24');
      const deletedAt = new Date('2025-03-25');

      const property = Property.reconstitute({
        id,
        tenantId,
        name: 'Casa del lago',
        description: 'Una hermosa casa',
        propertyType,
        address: 'Calle 123',
        city: 'Bogotá',
        state: 'Cundinamarca',
        country: 'Colombia',
        zipCode: '110111',
        location,
        checkInTime: '15:00',
        checkOutTime: '11:00',
        cancellationPolicy,
        hostPhone: '+573001234567',
        hostEmail: 'host@example.com',
        createdAt,
        updatedAt,
        deletedAt,
      });

      expect(property.getDeletedAt()).toEqual(deletedAt);
    });
  });

  describe('Getters', () => {
    let property: Property;

    beforeEach(() => {
      property = Property.create(validProps);
    });

    it('should get tenantId', () => {
      expect(property.getTenantId()).toEqual(tenantId);
    });

    it('should get state', () => {
      expect(property.getState()).toBe('Cundinamarca');
    });

    it('should get country', () => {
      expect(property.getCountry()).toBe('Colombia');
    });

    it('should get zipCode', () => {
      expect(property.getZipCode()).toBe('110111');
    });

    it('should get location', () => {
      expect(property.getLocation()).toEqual(location);
    });

    it('should get checkInTime', () => {
      expect(property.getCheckInTime()).toBe('15:00');
    });

    it('should get checkOutTime', () => {
      expect(property.getCheckOutTime()).toBe('11:00');
    });

    it('should get cancellationPolicy', () => {
      expect(property.getCancellationPolicy()).toEqual(cancellationPolicy);
    });

    it('should get hostPhone', () => {
      expect(property.getHostPhone()).toBe('+573001234567');
    });

    it('should get hostEmail', () => {
      expect(property.getHostEmail()).toBe('host@example.com');
    });

    it('should get id', () => {
      expect(property.getId()).toBeNull();
    });

    it('should get name', () => {
      expect(property.getName()).toBe('Casa del lago');
    });

    it('should get description', () => {
      expect(property.getDescription()).toBe('Una hermosa casa');
    });

    it('should get propertyType', () => {
      expect(property.getPropertyType()).toEqual(propertyType);
    });

    it('should get address', () => {
      expect(property.getAddress()).toBe('Calle 123');
    });

    it('should get city', () => {
      expect(property.getCity()).toBe('Bogotá');
    });

    it('should get createdAt', () => {
      expect(property.getCreatedAt()).toBeInstanceOf(Date);
    });

    it('should get updatedAt', () => {
      expect(property.getUpdatedAt()).toBeInstanceOf(Date);
    });

    it('should get deletedAt as null for created property', () => {
      expect(property.getDeletedAt()).toBeNull();
    });
  });

  describe('updateDetails', () => {
    let property: Property;

    beforeEach(() => {
      property = Property.create(validProps);
    });

    it('should update name', () => {
      property.updateDetails({ ...validProps, name: 'Nueva Casa' });
      expect(property.getName()).toBe('Nueva Casa');
    });

    it('should not update name when empty string', () => {
      const originalName = property.getName();
      property.updateDetails({ ...validProps, name: '' });
      expect(property.getName()).toBe(originalName);
    });

    it('should not update name when only whitespace', () => {
      const originalName = property.getName();
      property.updateDetails({ ...validProps, name: '   ' });
      expect(property.getName()).toBe(originalName);
    });

    it('should not update description when undefined', () => {
      const originalDescription = property.getDescription();
      property.updateDetails({ ...validProps, description: undefined });
      expect(property.getDescription()).toBe(originalDescription);
    });

    it.each([
      ['address', 'getAddress', '', 'empty string'],
      ['address', 'getAddress', '   ', 'whitespace'],
      ['city', 'getCity', '', 'empty string'],
      ['city', 'getCity', '   ', 'whitespace'],
      ['state', 'getState', '', 'empty string'],
      ['state', 'getState', '   ', 'whitespace'],
      ['country', 'getCountry', '', 'empty string'],
      ['country', 'getCountry', '   ', 'whitespace'],
      ['zipCode', 'getZipCode', '', 'empty string'],
      ['zipCode', 'getZipCode', '   ', 'whitespace'],
    ])('should not update %s when %s', (field, getter, value) => {
      const original = (property as any)[getter]();
      property.updateDetails({ ...validProps, [field]: value });
      expect((property as any)[getter]()).toBe(original);
    });

    it.each([
      ['address', 'getAddress', 'Nueva Calle'],
      ['city', 'getCity', 'Nueva Ciudad'],
      ['state', 'getState', 'Nuevo Estado'],
      ['country', 'getCountry', 'Nuevo País'],
      ['zipCode', 'getZipCode', '999999'],
    ])('should update %s with valid value', (field, getter, newValue) => {
      property.updateDetails({ ...validProps, [field]: newValue });
      expect((property as any)[getter]()).toBe(newValue);
    });

    it('should update location when provided', () => {
      const newLocation = Location.create(10.3932, -75.483);
      property.updateDetails({ ...validProps, location: newLocation });
      expect(property.getLocation()).toEqual(newLocation);
    });

    it('should not update location when undefined', () => {
      const originalLocation = property.getLocation();
      property.updateDetails({ ...validProps, location: undefined as any });
      expect(property.getLocation()).toEqual(originalLocation);
    });

    it('should trim whitespace from updated fields', () => {
      property.updateDetails({
        ...validProps,
        name: '  New House Name  ',
        address: '  New Address  ',
      });
      expect(property.getName()).toBe('New House Name');
      expect(property.getAddress()).toBe('New Address');
    });

    it('should update updatedAt timestamp', () => {
      const originalUpdatedAt = property.getUpdatedAt();
      property.updateDetails(validProps);
      expect(property.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime(),
      );
    });
  });

  describe('updateCheckInOut', () => {
    let property: Property;

    beforeEach(() => {
      property = Property.create(validProps);
    });

    it('should update check in and out times', () => {
      property.updateCheckInOut('14:00', '12:00');
      expect(property.getCheckInTime()).toBe('14:00');
      expect(property.getCheckOutTime()).toBe('12:00');
    });

    it('should update updatedAt timestamp', () => {
      const originalUpdatedAt = property.getUpdatedAt();
      property.updateCheckInOut('14:00', '12:00');
      expect(property.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime(),
      );
    });
  });

  describe('updateCancellationPolicy', () => {
    let property: Property;

    beforeEach(() => {
      property = Property.create(validProps);
    });

    it('should update cancellation policy', () => {
      const newPolicy = CancellationPolicy.create(
        CancellationPolicyEnum.STRICT,
      );
      property.updateCancellationPolicy(newPolicy);
      expect(property.getCancellationPolicy()).toEqual(newPolicy);
    });

    it('should update updatedAt timestamp', () => {
      const originalUpdatedAt = property.getUpdatedAt();
      const newPolicy = CancellationPolicy.create(
        CancellationPolicyEnum.STRICT,
      );
      property.updateCancellationPolicy(newPolicy);
      expect(property.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime(),
      );
    });
  });

  describe('updateHostContact', () => {
    let property: Property;

    beforeEach(() => {
      property = Property.create(validProps);
    });

    it('should update host phone and email', () => {
      property.updateHostContact('+573109876543', 'newemail@example.com');
      expect(property.getHostPhone()).toBe('+573109876543');
      expect(property.getHostEmail()).toBe('newemail@example.com');
    });

    it('should update updatedAt timestamp', () => {
      const originalUpdatedAt = property.getUpdatedAt();
      property.updateHostContact('+573109876543', 'newemail@example.com');
      expect(property.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime(),
      );
    });
  });

  describe('softDelete', () => {
    let property: Property;

    beforeEach(() => {
      property = Property.create(validProps);
    });

    it('should set deletedAt to current date', () => {
      const beforeDelete = new Date();
      property.softDelete();
      const afterDelete = new Date();

      const deletedAt = property.getDeletedAt();
      expect(deletedAt).not.toBeNull();
      expect(deletedAt!.getTime()).toBeGreaterThanOrEqual(
        beforeDelete.getTime(),
      );
      expect(deletedAt!.getTime()).toBeLessThanOrEqual(afterDelete.getTime());
    });

    it('should update updatedAt timestamp on soft delete', () => {
      const originalUpdatedAt = property.getUpdatedAt();
      property.softDelete();
      expect(property.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime(),
      );
    });

    it('should have same deletedAt and updatedAt values', () => {
      property.softDelete();
      expect(property.getDeletedAt()!.getTime()).toBe(
        property.getUpdatedAt().getTime(),
      );
    });
  });
});
