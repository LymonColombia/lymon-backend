import { Inject, Injectable } from '@nestjs/common';
import {
  GUEST_REPOSITORY,
  type GuestRepository,
} from '@/domain/guest/repositories/guest.repository';
import { Guest } from '@/domain/guest/entities/guest.entity';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

@Injectable()
export class SearchGuestsQuery {
  constructor(
    @Inject(GUEST_REPOSITORY)
    private readonly guestRepository: GuestRepository,
  ) {}

  async execute(
    tenantId: TenantId,
    term: string,
    page: number,
    limit: number,
    sortBy: 'createdAt' | 'fullName' | 'status',
    sortDirection: 'asc' | 'desc',
  ): Promise<{ guests: Guest[]; total: number }> {
    const sanitizedTerm = term?.trim().toLowerCase();

    if (!sanitizedTerm) {
      return this.guestRepository.findByTenantIdPaginated(
        tenantId,
        page,
        limit,
        sortBy,
        sortDirection,
      );
    }

    return this.guestRepository.searchPaginated(
      tenantId,
      sanitizedTerm,
      page,
      limit,
    );
  }
}
