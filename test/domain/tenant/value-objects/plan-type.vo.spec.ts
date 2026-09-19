import { PlanType } from '@/domain/tenant/value-objects/plan-type.vo';

describe('PlanType Value Object', () => {
  describe('create()', () => {
    it('creates a PlanType with TRIAL enum', () => {
      const planType = PlanType.create('TRIAL');
      expect(planType).toBeDefined();
    });

    it('creates a PlanType with LYMON_ONE enum', () => {
      const planType = PlanType.create('LYMON_ONE');
      expect(planType).toBeDefined();
    });

    it('creates a PlanType with LYMON_PLUS enum', () => {
      const planType = PlanType.create('LYMON_PLUS');
      expect(planType).toBeDefined();
    });

    it('creates a PlanType with LYMON_PRIME enum', () => {
      const planType = PlanType.create('LYMON_PRIME');
      expect(planType).toBeDefined();
    });

    it('throws error for invalid plan type', () => {
      expect(() => PlanType.create('INVALID_PLAN')).toThrow(
        'Invalid plan type INVALID_PLAN',
      );
    });
  });

  describe('toString()', () => {
    it('returns the string value of TRIAL plan', () => {
      const planType = PlanType.create('TRIAL');
      expect(planType.toString()).toBe('TRIAL');
    });

    it('returns the string value of LYMON_ONE plan', () => {
      const planType = PlanType.create('LYMON_ONE');
      expect(planType.toString()).toBe('LYMON_ONE');
    });

    it('returns the string value of LYMON_PLUS plan', () => {
      const planType = PlanType.create('LYMON_PLUS');
      expect(planType.toString()).toBe('LYMON_PLUS');
    });

    it('returns the string value of LYMON_PRIME plan', () => {
      const planType = PlanType.create('LYMON_PRIME');
      expect(planType.toString()).toBe('LYMON_PRIME');
    });
  });

  describe('equals()', () => {
    it('returns true when comparing same plan types', () => {
      const planType1 = PlanType.create('TRIAL');
      const planType2 = PlanType.create('TRIAL');
      expect(planType1.equals(planType2)).toBe(true);
    });

    it('returns false when comparing different plan types', () => {
      const planType1 = PlanType.create('TRIAL');
      const planType2 = PlanType.create('LYMON_ONE');
      expect(planType1.equals(planType2)).toBe(false);
    });

    it('returns false when comparing LYMON_ONE and LYMON_PLUS', () => {
      const planType1 = PlanType.create('LYMON_ONE');
      const planType2 = PlanType.create('LYMON_PLUS');
      expect(planType1.equals(planType2)).toBe(false);
    });

    it('returns false when comparing LYMON_PLUS and LYMON_PRIME', () => {
      const planType1 = PlanType.create('LYMON_PLUS');
      const planType2 = PlanType.create('LYMON_PRIME');
      expect(planType1.equals(planType2)).toBe(false);
    });
  });

  describe('isTrial()', () => {
    it('returns true for TRIAL plan', () => {
      const planType = PlanType.create('TRIAL');
      expect(planType.isTrial()).toBe(true);
    });

    it('returns false for LYMON_ONE plan', () => {
      const planType = PlanType.create('LYMON_ONE');
      expect(planType.isTrial()).toBe(false);
    });

    it('returns false for LYMON_PLUS plan', () => {
      const planType = PlanType.create('LYMON_PLUS');
      expect(planType.isTrial()).toBe(false);
    });

    it('returns false for LYMON_PRIME plan', () => {
      const planType = PlanType.create('LYMON_PRIME');
      expect(planType.isTrial()).toBe(false);
    });
  });

  describe('getSiteLimit()', () => {
    it('returns 2 for TRIAL plan', () => {
      const planType = PlanType.create('TRIAL');
      expect(planType.getSiteLimit()).toBe(2);
    });

    it('returns 5 for LYMON_ONE plan', () => {
      const planType = PlanType.create('LYMON_ONE');
      expect(planType.getSiteLimit()).toBe(5);
    });

    it('returns 20 for LYMON_PLUS plan', () => {
      const planType = PlanType.create('LYMON_PLUS');
      expect(planType.getSiteLimit()).toBe(20);
    });

    it('returns Number.MAX_SAFE_INTEGER for LYMON_PRIME plan', () => {
      const planType = PlanType.create('LYMON_PRIME');
      expect(planType.getSiteLimit()).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('returns 0 for unknown plan type (default case)', () => {
      const planType = PlanType.create('TRIAL');
      // Use Reflect to access private field and set invalid value to cover default case
      const invalidPlanType = Object.create(Object.getPrototypeOf(planType));
      Object.defineProperty(invalidPlanType, 'value', {
        value: 'UNKNOWN_PLAN' as any,
        writable: false,
      });
      expect(invalidPlanType.getSiteLimit()).toBe(0);
    });
  });

  describe('getStaffLimit()', () => {
    it('returns 0 for TRIAL plan', () => {
      const planType = PlanType.create('TRIAL');
      expect(planType.getStaffLimit()).toBe(0);
    });

    it('returns 2 for LYMON_ONE plan', () => {
      const planType = PlanType.create('LYMON_ONE');
      expect(planType.getStaffLimit()).toBe(2);
    });

    it('returns 10 for LYMON_PLUS plan', () => {
      const planType = PlanType.create('LYMON_PLUS');
      expect(planType.getStaffLimit()).toBe(10);
    });

    it('returns Number.MAX_SAFE_INTEGER for LYMON_PRIME plan', () => {
      const planType = PlanType.create('LYMON_PRIME');
      expect(planType.getStaffLimit()).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('returns 0 for unknown plan type (default case)', () => {
      const planType = PlanType.create('TRIAL');
      // Use Reflect to access private field and set invalid value to cover default case
      const invalidPlanType = Object.create(Object.getPrototypeOf(planType));
      Object.defineProperty(invalidPlanType, 'value', {
        value: 'UNKNOWN_PLAN' as any,
        writable: false,
      });
      expect(invalidPlanType.getStaffLimit()).toBe(0);
    });
  });
});
