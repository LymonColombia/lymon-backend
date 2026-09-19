import { QueryBus } from '@nestjs/cqrs';
import { GuestExperienceController } from '@/presentation/controllers/guest-experience.controller';
import { GetAvailableExperiencesQuery } from '@/application/experience/queries/GetAvailableExperiences/get-available-experiences.query';
import { GetAvailableExperienceByIdQuery } from '@/application/experience/queries/GetAvailableExperienceById/get-available-experience-by-id.query';
import { GetAvailableExperiencesResult } from '@/application/experience/queries/GetAvailableExperiences/get-available-experiences.result';
import { GetAvailableExperienceByIdResult } from '@/application/experience/queries/GetAvailableExperienceById/get-available-experience-by-id.result';

describe('GuestExperienceController', () => {
  let controller: GuestExperienceController;
  let queryBus: { execute: jest.Mock };

  const experience = {
    id: 'exp-1',
    tenantId: 'tenant-1',
    propertyId: 'prop-1',
    unitIds: ['unit-1'],
    name: 'Kayak tour',
    description: 'Tour',
    category: 'ADVENTURE',
    priceCop: 100000,
    durationHours: 3,
    minimumParticipants: 2,
    capacity: 10,
    mediaUrls: ['https://img'],
    location: { label: 'Dock', address: 'Address', lat: 1, lng: 2 },
    availabilityType: 'DATE_RANGE',
    startAt: null,
    endAt: null,
    recurrence: null,
    blackoutRanges: [],
    allowStandalonePurchase: true,
    allowReservationPurchase: true,
    minNoticeHours: 2,
    purchaseCutoffHours: 24,
    status: 'ACTIVE',
  } as any;

  beforeEach(() => {
    queryBus = { execute: jest.fn() };
    controller = new GuestExperienceController(queryBus as unknown as QueryBus);
  });

  it('list endpoint dispatches query and returns card fields without internal fields', async () => {
    queryBus.execute.mockResolvedValue(
      new GetAvailableExperiencesResult([experience], 1, 1, 10),
    );

    const result = await controller.findAvailable({ propertyId: 'prop-1' });

    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(GetAvailableExperiencesQuery),
    );
    const dispatchedQuery = queryBus.execute.mock.calls[0][0];
    expect(dispatchedQuery.propertyId).toBe('prop-1');
    expect(result.experiences[0]).not.toHaveProperty('tenantId');
    expect(result.experiences[0]).not.toHaveProperty('unitIds');
    expect(result.experiences[0]).not.toHaveProperty('status');
    expect(result.experiences[0]).toMatchObject({
      name: 'Kayak tour',
      coverImageUrl: 'https://img',
      priceCop: 100000,
      durationHours: 3,
      capacity: 10,
      availabilityType: 'DATE_RANGE',
    });
    expect(result.experiences[0].minimumParticipants).toBe(2);
  });

  it('by id endpoint dispatches query and returns propertyName and units', async () => {
    queryBus.execute.mockResolvedValue(
      new GetAvailableExperienceByIdResult({
        experience,
        propertyName: 'Hotel Boutique',
        units: [{ id: 'unit-1', name: 'Suite 101', maxGuests: 4, pricePerNight: 250000 }],
      }),
    );

    const result = await controller.findById('exp-1');

    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(GetAvailableExperienceByIdQuery),
    );
    expect(result.data.propertyName).toBe('Hotel Boutique');
    expect(result.data.units).toEqual([
      { id: 'unit-1', name: 'Suite 101', maxGuests: 4, pricePerNight: 250000 },
    ]);
  });
});
