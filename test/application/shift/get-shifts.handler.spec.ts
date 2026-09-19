import { ForbiddenException } from '@nestjs/common';
import { GetShiftsHandler } from '@/application/shift/queries/get-shifts/get-shifts.handler';
import { GetShiftsQuery } from '@/application/shift/queries/get-shifts/get-shifts.query';
import { ShiftRepository } from '@/domain/shift/repositories/shift.repository';
import { Shift } from '@/domain/shift/entities/shift.entity';
import { ShiftId } from '@/domain/shift/value-objects/shift-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { UserId } from '@/domain/user/entities/user.entity';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';

function makeShift(overrides?: { weekdays?: number[] | null }): Shift {
  return Shift.reconstitute({
    id: ShiftId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9d000000000'),
    tenantId: TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
    staffMemberIds: [UserId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c100000000')],
    propertyId: PropertyId.create('65f1a1a2-b3c4-d5e6-f7a8-b9c300000000'),
    name: 'Morning Cleaning',
    startDate: new Date('2026-03-01T00:00:00.000Z'),
    endDate: new Date('2026-03-31T00:00:00.000Z'),
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

describe('GetShiftsHandler', () => {
  const tenantId = '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000';
  const actorUserId = '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000';
  const otherUserId = '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000';

  let shiftRepository: jest.Mocked<ShiftRepository>;
  let handler: GetShiftsHandler;

  beforeEach(() => {
    shiftRepository = {
      save: jest.fn(),
      delete: jest.fn(),
      findById: jest.fn(),
      findByFilters: jest.fn(),
      findOverlappingByStaffInRange: jest.fn(),
      findOverlappingByStaff: jest.fn(),
    };

    shiftRepository.findByFilters.mockResolvedValue([]);
    handler = new GetShiftsHandler(shiftRepository);
  });

  it('throws when staff user asks shifts for another user', async () => {
    const query = new GetShiftsQuery(
      tenantId,
      {},
      actorUserId,
      false,
      otherUserId,
    );

    await expect(handler.execute(query)).rejects.toThrow(ForbiddenException);
    expect(shiftRepository.findByFilters).not.toHaveBeenCalled();
  });

  it('filters by requested staff member when manager asks by id', async () => {
    const query = new GetShiftsQuery(
      tenantId,
      {},
      actorUserId,
      true,
      otherUserId,
    );

    await handler.execute(query);

    const [, , visibleStaffMemberId] =
      shiftRepository.findByFilters.mock.calls[0];
    expect(visibleStaffMemberId?.toString()).toBe(otherUserId);
  });

  it('keeps existing behavior for staff without explicit staffMemberId', async () => {
    const query = new GetShiftsQuery(tenantId, {}, actorUserId, false);

    await handler.execute(query);

    const [, , visibleStaffMemberId] =
      shiftRepository.findByFilters.mock.calls[0];
    expect(visibleStaffMemberId?.toString()).toBe(actorUserId);
  });

  it('maps weekdays to result when shift has weekdays', async () => {
    shiftRepository.findByFilters.mockResolvedValue([
      makeShift({ weekdays: [1, 3] }),
    ]);

    const query = new GetShiftsQuery(tenantId, {}, actorUserId, true);
    const result = await handler.execute(query);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].weekdays).toEqual([1, 3]);
  });

  it('maps weekdays as null when shift has no weekdays', async () => {
    shiftRepository.findByFilters.mockResolvedValue([makeShift()]);

    const query = new GetShiftsQuery(tenantId, {}, actorUserId, true);
    const result = await handler.execute(query);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].weekdays).toBeNull();
  });
});
