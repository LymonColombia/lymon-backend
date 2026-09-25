import { Inject, Injectable } from '@nestjs/common';
import {
  GUEST_REPOSITORY,
  type GuestRepository,
} from '@/domain/guest/repositories/guest.repository';
import { Guest } from '@/domain/guest/entities/guest.entity';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

@Injectable()
export class FindGuestByDocumentNumberQuery {
  constructor(
    @Inject(GUEST_REPOSITORY)
    private readonly guestRepository: GuestRepository,
  ) {}

  async execute(
    tenantId: TenantId,
    documentNumber: string,
  ): Promise<Guest | null> {
    const sanitized = documentNumber?.trim();
    if (!sanitized) {
      return null;
    }

    return this.guestRepository.findByDocumentNumber(tenantId, sanitized);
  }
}
