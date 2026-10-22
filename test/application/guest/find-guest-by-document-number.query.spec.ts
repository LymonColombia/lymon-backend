import { Test, TestingModule } from '@nestjs/testing';
import { FindGuestByDocumentNumberQuery } from '@/application/guest/queries/find-guest-by-document-number.query';
import { GUEST_REPOSITORY } from '@/domain/guest/repositories/guest.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { Guest } from '@/domain/guest/entities/guest.entity';

describe('FindGuestByDocumentNumberQuery', () => {
  let query: FindGuestByDocumentNumberQuery;
  let mockRepository: { findByDocumentNumber: jest.Mock };

  const tenantId = TenantId.createFromString('hotel-123');
  const guest = Guest.create({
    tenantId,
    identity: { documentType: 'CC', documentNumber: '12345' },
    fullName: 'Juan Perez',
    primaryEmail: 'juan@example.com',
  });

  beforeEach(async () => {
    mockRepository = {
      findByDocumentNumber: jest.fn().mockResolvedValue(guest),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindGuestByDocumentNumberQuery,
        {
          provide: GUEST_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    query = module.get<FindGuestByDocumentNumberQuery>(
      FindGuestByDocumentNumberQuery,
    );
  });

  it('trims document number and delegates to repository', async () => {
    const result = await query.execute(tenantId, '  12345  ');

    expect(mockRepository.findByDocumentNumber).toHaveBeenCalledWith(
      tenantId,
      '12345',
    );
    expect(result).toBe(guest);
  });

  it('returns null without calling repository when document number is empty', async () => {
    const result = await query.execute(tenantId, '   ');

    expect(mockRepository.findByDocumentNumber).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('returns null without calling repository when document number is undefined', async () => {
    const result = await query.execute(
      tenantId,
      undefined as unknown as string,
    );

    expect(mockRepository.findByDocumentNumber).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('returns null when repository finds no guest', async () => {
    mockRepository.findByDocumentNumber.mockResolvedValue(null);

    const result = await query.execute(tenantId, '99999');

    expect(result).toBeNull();
  });
});
