import { NotFoundException } from '@nestjs/common';
import { AddExperienceToCartHandler } from '@/application/cart/commands/add-experience-to-cart/add-experience-to-cart.handler';
import { AddExperienceToCartCommand } from '@/application/cart/commands/add-experience-to-cart/add-experience-to-cart.command';
import { DomainException } from '@/domain/shared/exceptions/domain.exception';
import { createCartRepositoryMock } from '@test/shared/mocks/repositories/cart-repository.mock';
import { createExperienceRepositoryMock } from '@test/shared/mocks/repositories/experience-repository.mock';
import { makeExperience } from '@test/shared/fixtures/experience.fixture';
import { makeCart } from '@test/shared/fixtures/cart.fixture';
import {
  ExperienceStatus,
  ExperienceStatusEnum,
} from '@/domain/experience/value-objects/experience-status.vo';
import {
  ExperienceCategory,
  ExperienceCategoryEnum,
} from '@/domain/experience/value-objects/experience-category.vo';
import {
  ExperienceAvailabilityType,
  ExperienceAvailabilityTypeEnum,
} from '@/domain/experience/value-objects/experience-availability-type.vo';
import { Experience } from '@/domain/experience/entities/experience.entity';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

const GUEST_ACCOUNT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000';
const TENANT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000';
const EXPERIENCE_ID = '65f1a1a2-b3c4-d5e6-f7a8-bb1000000000';

function makeArchivedExperience(): Experience {
  return Experience.reconstitute({
    id: ExperienceId.create(EXPERIENCE_ID),
    tenantId: TenantId.createFromString(TENANT_ID),
    propertyId: null,
    unitIds: [],
    name: 'Test',
    description: 'Test experience',
    category: ExperienceCategory.create(ExperienceCategoryEnum.TRANSPORTATION),
    priceCop: 50000,
    durationHours: 2,
    minimumParticipants: 1,
    capacity: 5,
    location: { label: 'Lobby', lat: 4.6097, lng: -74.0817 },
    availabilityType: ExperienceAvailabilityType.create(
      ExperienceAvailabilityTypeEnum.DATE_RANGE,
    ),
    startAt: new Date('2099-01-10'),
    endAt: new Date('2099-01-20'),
    blackoutRanges: [],
    allowStandalonePurchase: true,
    allowReservationPurchase: false,
    minNoticeHours: 2,
    purchaseCutoffHours: 24,
    status: ExperienceStatus.create(ExperienceStatusEnum.ARCHIVED),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });
}

describe('AddExperienceToCartHandler', () => {
  let handler: AddExperienceToCartHandler;
  let cartRepository: ReturnType<typeof createCartRepositoryMock>;
  let experienceRepository: ReturnType<typeof createExperienceRepositoryMock>;

  beforeEach(() => {
    cartRepository = createCartRepositoryMock();
    experienceRepository = createExperienceRepositoryMock();
    handler = new AddExperienceToCartHandler(
      cartRepository,
      experienceRepository,
    );
  });

  const makeCommand = (overrides?: Partial<AddExperienceToCartCommand>) =>
    new AddExperienceToCartCommand(
      overrides?.guestAccountId ?? GUEST_ACCOUNT_ID,
      overrides?.tenantId ?? TENANT_ID,
      overrides?.experienceId ?? EXPERIENCE_ID,
      overrides?.quantity ?? 1,
    );

  it('creates a new cart and adds experience when no open cart exists', async () => {
    const experience = makeExperience();
    experienceRepository.findById.mockResolvedValue(experience);
    cartRepository.findOpenByGuest.mockResolvedValue(null);
    cartRepository.save.mockResolvedValue('new-cart-id');

    await handler.execute(makeCommand());

    expect(cartRepository.save).toHaveBeenCalledTimes(1);
    const savedCart = cartRepository.save.mock.calls[0][0];
    expect(savedCart.getExperienceItems()).toHaveLength(1);
    expect(savedCart.getExperienceItems()[0].quantity).toBe(1);
  });

  it('adds to existing open cart', async () => {
    const experience = makeExperience();
    experienceRepository.findById.mockResolvedValue(experience);
    const existingCart = makeCart();
    cartRepository.findOpenByGuest.mockResolvedValue(existingCart);
    cartRepository.save.mockResolvedValue(existingCart.getId()!.toString());

    await handler.execute(makeCommand());

    expect(cartRepository.save).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundException when experience does not exist', async () => {
    experienceRepository.findById.mockResolvedValue(null);

    await expect(handler.execute(makeCommand())).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws DomainException when experience is not ACTIVE', async () => {
    experienceRepository.findById.mockResolvedValue(makeArchivedExperience());

    await expect(handler.execute(makeCommand())).rejects.toThrow(
      DomainException,
    );
  });

  it('throws DomainException when standalone purchase not allowed', async () => {
    const experience = makeExperience();
    jest.spyOn(experience, 'getAllowStandalonePurchase').mockReturnValue(false);
    experienceRepository.findById.mockResolvedValue(experience);

    await expect(handler.execute(makeCommand())).rejects.toThrow(
      DomainException,
    );
  });

  it('throws DomainException when quantity is below the minimum participants', async () => {
    const experience = makeExperience({ minimumParticipants: 3 });
    experienceRepository.findById.mockResolvedValue(experience);

    await expect(handler.execute(makeCommand({ quantity: 2 }))).rejects.toThrow(
      'This experience requires at least 3 participants',
    );
  });

  it('throws DomainException when quantity exceeds capacity', async () => {
    const experience = makeExperience({ capacity: 2 });
    experienceRepository.findById.mockResolvedValue(experience);

    await expect(handler.execute(makeCommand({ quantity: 3 }))).rejects.toThrow(
      'This experience allows up to 2 participants',
    );
  });
});
