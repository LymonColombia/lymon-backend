import { PrismaShiftRepository } from '@/infrastructure/persistence/repositories/prisma-shift.repository';
import { Shift } from '@/domain/shift/entities/shift.entity';
import { ShiftId } from '@/domain/shift/value-objects/shift-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { UserId } from '@/domain/user/entities/user.entity';
import { prisma, resetDatabase } from './prisma.helper';
import { seedProperty, seedTenant, seedUser } from './fixtures';

describe('PrismaShiftRepository', () => {
  const repo = new PrismaShiftRepository(prisma);

  let tenantId: string;
  let propertyId: string;
  let staffA: string;
  let staffB: string;

  beforeEach(async () => {
    await resetDatabase();
    tenantId = (await seedTenant()).id;
    propertyId = (await seedProperty(tenantId)).id;
    staffA = (await seedUser(tenantId, 'a@costa.com')).id;
    staffB = (await seedUser(tenantId, 'b@costa.com')).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const newShift = (
    overrides: {
      staff?: string[];
      startDate?: string;
      endDate?: string | null;
      startMinutes?: number;
      endMinutes?: number;
      weekdays?: number[];
    } = {},
  ) =>
    Shift.create({
      tenantId: TenantId.createFromString(tenantId),
      staffMemberIds: (overrides.staff ?? [staffA]).map((id) =>
        UserId.createFromString(id),
      ),
      propertyId: PropertyId.create(propertyId),
      name: 'Morning',
      startDate: new Date(overrides.startDate ?? '2027-03-01'),
      endDate: overrides.endDate == null ? null : new Date(overrides.endDate),
      startHour: '08:00',
      endHour: '16:00',
      startMinutes: overrides.startMinutes ?? 480,
      endMinutes: overrides.endMinutes ?? 960,
      weekdays: overrides.weekdays,
      createdBy: staffA,
      createdByEmail: 'a@costa.com',
    });

  it('stores staff as join rows and round-trips the clock times', async () => {
    const id = await repo.save(newShift({ staff: [staffA, staffB] }));

    expect(await prisma.shift_staff_members.count()).toBe(2);

    const found = (await repo.findById(ShiftId.createFromString(id)))!;
    expect(found.getStartHour()).toBe('08:00');
    expect(found.getEndHour()).toBe('16:00');
    expect(found.getStaffMemberIds().map((s) => s.toString()).sort()).toEqual(
      [staffA, staffB].sort(),
    );
    // no weekday restriction is null in the domain, empty array in the column
    expect(found.getWeekdays()).toBeNull();
  });

  it('replaces the staff list on update instead of appending', async () => {
    const id = await repo.save(newShift({ staff: [staffA, staffB] }));
    const shift = (await repo.findById(ShiftId.createFromString(id)))!;

    shift.update(
      { name: 'Morning', staffMemberIds: [UserId.createFromString(staffB)] },
      new Date(),
    );
    await repo.save(shift);

    expect(await prisma.shift_staff_members.count()).toBe(1);
    expect(
      (await repo.findById(ShiftId.createFromString(id)))!
        .getStaffMemberIds()
        .map((s) => s.toString()),
    ).toEqual([staffB]);
  });

  it('filters by window, treating a null end date as open-ended', async () => {
    await repo.save(newShift({ startDate: '2027-03-01', endDate: '2027-03-10' }));
    await repo.save(newShift({ startDate: '2027-01-01', endDate: null }));

    const tenant = TenantId.createFromString(tenantId);
    expect(await repo.findByFilters(tenant, {})).toHaveLength(2);
    expect(
      await repo.findByFilters(tenant, {
        dateFrom: new Date('2027-06-01'),
        dateTo: new Date('2027-06-30'),
      }),
    ).toHaveLength(1);
    expect(
      await repo.findByFilters(tenant, {
        dateFrom: new Date('2027-03-05'),
        dateTo: new Date('2027-03-06'),
      }),
    ).toHaveLength(2);
  });

  it('only shows a staff member their own shifts when scoped', async () => {
    await repo.save(newShift({ staff: [staffA] }));
    await repo.save(newShift({ staff: [staffB], startDate: '2027-04-01' }));

    const tenant = TenantId.createFromString(tenantId);
    expect(
      await repo.findByFilters(tenant, {}, UserId.createFromString(staffB)),
    ).toHaveLength(1);
  });

  it('detects an overlapping shift for the same staff member', async () => {
    const existing = await repo.save(newShift({ startMinutes: 480, endMinutes: 960 }));
    const tenant = TenantId.createFromString(tenantId);
    const staff = UserId.createFromString(staffA);

    expect(
      await repo.findOverlappingByStaff(tenant, staff, new Date('2027-03-01'), 900, 1200),
    ).not.toBeNull();

    // touching but not overlapping: [960,1200) starts exactly when the other ends
    expect(
      await repo.findOverlappingByStaff(tenant, staff, new Date('2027-03-01'), 960, 1200),
    ).toBeNull();

    // the shift being edited is excluded from its own clash check
    expect(
      await repo.findOverlappingByStaff(
        tenant,
        staff,
        new Date('2027-03-01'),
        900,
        1200,
        ShiftId.createFromString(existing),
      ),
    ).toBeNull();

    // another staff member is unaffected
    expect(
      await repo.findOverlappingByStaff(
        tenant,
        UserId.createFromString(staffB),
        new Date('2027-03-01'),
        900,
        1200,
      ),
    ).toBeNull();
  });

  it('treats an unrestricted shift as clashing on every weekday', async () => {
    await repo.save(newShift({ startDate: '2027-03-01', endDate: null }));
    const tenant = TenantId.createFromString(tenantId);
    const staff = UserId.createFromString(staffA);

    expect(
      await repo.findOverlappingByStaffInRange(
        tenant,
        staff,
        new Date('2027-03-01'),
        null,
        900,
        1200,
        undefined,
        [1, 3],
      ),
    ).not.toBeNull();
  });

  it('deletes the shift and its staff rows', async () => {
    const id = await repo.save(newShift({ staff: [staffA, staffB] }));
    await repo.delete(ShiftId.createFromString(id));

    expect(await repo.findById(ShiftId.createFromString(id))).toBeNull();
    expect(await prisma.shift_staff_members.count()).toBe(0);
  });
});
