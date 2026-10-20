import { Client } from 'pg';
import { prisma, resetDatabase } from './prisma.helper';
import {
  seedGuest,
  seedProperty,
  seedRole,
  seedTenant,
  seedUnit,
  seedUser,
} from './fixtures';

// SQLSTATEs the constraints must raise.
const FK_VIOLATION = '23503';
const UNIQUE_VIOLATION = '23505';
const CHECK_VIOLATION = '23514';

/**
 * Guards the rules that live only in hand-written migration SQL (cross-tenant composite
 * FKs, CHECKs, NULLS NOT DISTINCT) — Prisma can't express them, so nothing else notices
 * if a migration drops one. Each case tries a forbidden insert and demands the exact
 * SQLSTATE. Raw pg on purpose: its errors carry the SQLSTATE as-is.
 */
describe('schema constraints', () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });

  let a: {
    tenantId: string;
    propertyId: string;
    unitId: string;
    guestId: string;
    userId: string;
    roleId: string;
  };
  let b: { propertyId: string; unitId: string };

  const rejects = (sql: string, params: unknown[], code: string) =>
    expect(pg.query(sql, params)).rejects.toMatchObject({ code });

  const insertUnit = `
    INSERT INTO units (tenant_id, property_id, name, description, inventory_count,
                       max_guests, standard_guests, bathrooms_count, price_per_night)
    VALUES ($1, $2, 'stolen', 'd', 1, 2, 2, 1, 1)`;

  const insertReservation = `
    INSERT INTO reservations (tenant_id, property_id, unit_id, guest_id, check_in, check_out,
                              source, guests_count, price_per_night, total_price,
                              reservation_number)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 1, 1, $8)`;

  const insertGrant = `
    INSERT INTO user_role_assignments (tenant_id, user_id, role_id, scope_type,
                                       property_id, unit_id)
    VALUES ($1, $2, $3, $4, $5, $6)`;

  beforeAll(() => pg.connect());

  afterAll(async () => {
    await pg.end();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
    const tenantA = (await seedTenant()).id;
    const propertyA = (await seedProperty(tenantA)).id;
    a = {
      tenantId: tenantA,
      propertyId: propertyA,
      unitId: (await seedUnit(tenantA, propertyA)).id,
      guestId: (await seedGuest(tenantA)).id,
      userId: (await seedUser(tenantA)).id,
      roleId: (await seedRole('STAFF')).id,
    };

    const tenantB = (await seedTenant()).id;
    const propertyB = (await seedProperty(tenantB)).id;
    b = {
      propertyId: propertyB,
      unitId: (await seedUnit(tenantB, propertyB)).id,
    };
  });

  describe('tenant containment', () => {
    it("rejects a unit hung off another tenant's property", () =>
      rejects(insertUnit, [a.tenantId, b.propertyId], FK_VIOLATION));

    it("rejects a reservation on another tenant's unit", () =>
      rejects(
        insertReservation,
        [
          a.tenantId,
          a.propertyId,
          b.unitId,
          a.guestId,
          '2026-01-01',
          '2026-01-02',
          'MANUAL',
          1,
        ],
        FK_VIOLATION,
      ));

    it('rejects a reservation whose unit is not on the claimed property', () =>
      rejects(
        insertReservation,
        [
          a.tenantId,
          b.propertyId,
          a.unitId,
          a.guestId,
          '2026-01-01',
          '2026-01-02',
          'MANUAL',
          1,
        ],
        FK_VIOLATION,
      ));
  });

  describe('scope grants', () => {
    it("rejects a grant scoped to another tenant's property", () =>
      rejects(
        insertGrant,
        [a.tenantId, a.userId, a.roleId, 'PROPERTY', b.propertyId, null],
        FK_VIOLATION,
      ));

    it("rejects a grant scoped to another tenant's unit", () =>
      rejects(
        insertGrant,
        [a.tenantId, a.userId, a.roleId, 'UNIT', a.propertyId, b.unitId],
        FK_VIOLATION,
      ));

    it('rejects a PROPERTY-scoped grant that carries a unit_id', () =>
      rejects(
        insertGrant,
        [a.tenantId, a.userId, a.roleId, 'PROPERTY', a.propertyId, a.unitId],
        CHECK_VIOLATION,
      ));

    it('rejects the same grant twice (NULLS NOT DISTINCT)', async () => {
      const grant = [a.tenantId, a.userId, a.roleId, 'TENANT', null, null];
      await pg.query(insertGrant, grant);
      await rejects(insertGrant, grant, UNIQUE_VIOLATION);
    });
  });

  describe('reservations', () => {
    it('rejects a reservation_number reused within the tenant', async () => {
      const row = [a.tenantId, a.propertyId, a.unitId, a.guestId];
      await pg.query(insertReservation, [
        ...row,
        '2026-01-01',
        '2026-01-02',
        'MANUAL',
        1,
      ]);
      await rejects(
        insertReservation,
        [...row, '2026-06-01', '2026-06-02', 'MANUAL', 1],
        UNIQUE_VIOLATION,
      );
    });

    it('rejects check_out before check_in', () =>
      rejects(
        insertReservation,
        [
          a.tenantId,
          a.propertyId,
          a.unitId,
          a.guestId,
          '2026-06-02',
          '2026-06-01',
          'MANUAL',
          1,
        ],
        CHECK_VIOLATION,
      ));

    it('rejects a source outside MANUAL|DIRECT', () =>
      rejects(
        insertReservation,
        [
          a.tenantId,
          a.propertyId,
          a.unitId,
          a.guestId,
          '2026-07-01',
          '2026-07-02',
          'AIRBNB',
          1,
        ],
        CHECK_VIOLATION,
      ));
  });
});
