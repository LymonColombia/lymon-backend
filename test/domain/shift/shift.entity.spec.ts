import { Shift } from '@/domain/shift/entities/shift.entity';
import { ShiftId } from '@/domain/shift/value-objects/shift-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { UserId } from '@/domain/user/entities/user.entity';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';

const TENANT_ID = TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000');
const STAFF_ID = UserId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c100000000');
const PROPERTY_ID = PropertyId.create('65f1a1a2-b3c4-d5e6-f7a8-b9c300000000');

function buildCreateParams(overrides?: { weekdays?: number[] }) {
  return {
    tenantId: TENANT_ID,
    staffMemberIds: [STAFF_ID],
    propertyId: PROPERTY_ID,
    name: 'Morning Cleaning',
    startDate: new Date('2026-03-01T00:00:00.000Z'),
    endDate: new Date('2026-03-31T00:00:00.000Z'),
    startHour: '07:00',
    endHour: '12:00',
    startMinutes: 420,
    endMinutes: 720,
    weekdays: overrides?.weekdays,
    notes: 'test note',
    createdBy: 'actor-id',
    createdByEmail: 'actor@example.com',
  };
}

function reconstitute(overrides?: { weekdays?: number[] | null }) {
  return Shift.reconstitute({
    id: ShiftId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9d000000000'),
    tenantId: TENANT_ID,
    staffMemberIds: [STAFF_ID],
    propertyId: PROPERTY_ID,
    name: 'Morning Cleaning',
    startDate: new Date('2099-03-01T00:00:00.000Z'),
    endDate: new Date('2099-03-31T00:00:00.000Z'),
    startHour: '07:00',
    endHour: '12:00',
    startMinutes: 420,
    endMinutes: 720,
    weekdays: overrides?.weekdays ?? null,
    notes: null,
    createdBy: null,
    createdByEmail: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('Shift entity – weekdays', () => {
  describe('create', () => {
    it('stores weekdays when provided', () => {
      const shift = Shift.create(buildCreateParams({ weekdays: [1, 3, 5] }));
      expect(shift.getWeekdays()).toEqual([1, 3, 5]);
    });

    it('stores null when weekdays omitted', () => {
      const shift = Shift.create(buildCreateParams());
      expect(shift.getWeekdays()).toBeNull();
    });

    it('stores null when weekdays is empty array', () => {
      const shift = Shift.create(buildCreateParams({ weekdays: [] }));
      expect(shift.getWeekdays()).toBeNull();
    });

    it('does not share reference with input array', () => {
      const days = [1, 3];
      const shift = Shift.create(buildCreateParams({ weekdays: days }));
      days.push(5);
      expect(shift.getWeekdays()).toEqual([1, 3]);
    });
  });

  describe('reconstitute', () => {
    it('preserves weekdays from persistence', () => {
      const shift = reconstitute({ weekdays: [0, 6] });
      expect(shift.getWeekdays()).toEqual([0, 6]);
    });

    it('preserves null weekdays', () => {
      const shift = reconstitute({ weekdays: null });
      expect(shift.getWeekdays()).toBeNull();
    });
  });

  describe('update', () => {
    it('updates weekdays via update()', () => {
      const shift = reconstitute({ weekdays: [1, 3] });

      shift.update(
        {
          name: shift.getName(),
          weekdays: [2, 4],
        },
        new Date(),
      );

      expect(shift.getWeekdays()).toEqual([2, 4]);
    });

    it('clears weekdays when set to null', () => {
      const shift = reconstitute({ weekdays: [1, 3] });

      shift.update(
        {
          name: shift.getName(),
          weekdays: null,
        },
        new Date(),
      );

      expect(shift.getWeekdays()).toBeNull();
    });

    it('clears weekdays when set to empty array', () => {
      const shift = reconstitute({ weekdays: [1, 3] });

      shift.update(
        {
          name: shift.getName(),
          weekdays: [],
        },
        new Date(),
      );

      expect(shift.getWeekdays()).toBeNull();
    });

    it('preserves weekdays when not included in update', () => {
      const shift = reconstitute({ weekdays: [1, 3] });

      shift.update(
        {
          name: shift.getName(),
          notes: 'updated note',
        },
        new Date(),
      );

      expect(shift.getWeekdays()).toEqual([1, 3]);
    });
  });
});
