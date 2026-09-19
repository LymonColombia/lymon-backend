import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetGuestEmailsByGuestIdQuery } from './get-guest-emails-by-guest-id.query';
import {
  GetGuestEmailsByGuestIdResult,
  GuestEmailDto,
} from './get-guest-emails-by-guest-id.result';
import { GUEST_EMAIL_REPOSITORY } from '@/domain/guest-email/repositories/guest-email.repository';
import type { GuestEmailRepository } from '@/domain/guest-email/repositories/guest-email.repository';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

@QueryHandler(GetGuestEmailsByGuestIdQuery)
export class GetGuestEmailsByGuestIdHandler implements IQueryHandler<
  GetGuestEmailsByGuestIdQuery,
  GetGuestEmailsByGuestIdResult
> {
  constructor(
    @Inject(GUEST_EMAIL_REPOSITORY)
    private readonly guestEmailRepository: GuestEmailRepository,
  ) {}

  async execute(
    query: GetGuestEmailsByGuestIdQuery,
  ): Promise<GetGuestEmailsByGuestIdResult> {
    let guestId: GuestId;
    let tenantId: TenantId;

    try {
      guestId = GuestId.createFromString(query.guestId);
      tenantId = TenantId.createFromString(query.tenantId);
    } catch {
      return new GetGuestEmailsByGuestIdResult([], 0, query.page, query.limit);
    }

    const { emails, total } =
      await this.guestEmailRepository.findByGuestIdPaginated(
        tenantId,
        guestId,
        query.page,
        query.limit,
      );

    const items: GuestEmailDto[] = emails.map((email) => ({
      id: email.getId().toString(),
      guestId: email.getGuestId().toString(),
      subject: email.getSubject(),
      status: email.getStatus(),
      messageId: email.getMessageId(),
      attachments: email.getAttachments().map((att) => ({
        url: att.url,
        name: att.name,
        type: att.type,
      })),
      sentById: email.getSentById(),
      createdAt: email.getCreatedAt(),
    }));

    return new GetGuestEmailsByGuestIdResult(
      items,
      total,
      query.page,
      query.limit,
    );
  }
}
