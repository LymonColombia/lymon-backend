import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GUEST_MESSAGE_REPOSITORY } from '@/domain/guest-message/repositories/guest-message.repository';
import type { GuestMessageRepository } from '@/domain/guest-message/repositories/guest-message.repository';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GetGuestMessagesByGuestIdQuery } from './get-guest-messages-by-guest-id.query';
import {
  GetGuestMessagesByGuestIdResult,
  GuestMessageDto,
} from './get-guest-messages-by-guest-id.result';

@QueryHandler(GetGuestMessagesByGuestIdQuery)
export class GetGuestMessagesByGuestIdHandler
  implements
    IQueryHandler<
      GetGuestMessagesByGuestIdQuery,
      GetGuestMessagesByGuestIdResult
    >
{
  constructor(
    @Inject(GUEST_MESSAGE_REPOSITORY)
    private readonly guestMessageRepository: GuestMessageRepository,
  ) {}

  async execute(
    query: GetGuestMessagesByGuestIdQuery,
  ): Promise<GetGuestMessagesByGuestIdResult> {
    let guestId: GuestId;
    let tenantId: TenantId;

    try {
      guestId = GuestId.createFromString(query.guestId);
      tenantId = TenantId.createFromString(query.tenantId);
    } catch {
      return new GetGuestMessagesByGuestIdResult([], 0, query.page, query.limit);
    }

    const { messages, total } =
      await this.guestMessageRepository.findByGuestIdPaginated(
        tenantId,
        guestId,
        query.page,
        query.limit,
      );

    const items: GuestMessageDto[] = messages.map((msg) => ({
      id: msg.getId().toString(),
      guestId: msg.getGuestId().toString(),
      channel: msg.getChannel(),
      direction: msg.getDirection(),
      status: msg.getStatus(),
      preview: msg.getPreview(),
      sentBy: msg.getSentBy(),
      providerMessageId: msg.getProviderMessageId(),
      attachments: msg.getAttachments().map((att) => ({
        url: att.url,
        name: att.name,
        type: att.type,
      })),
      createdAt: msg.getCreatedAt(),
    }));

    return new GetGuestMessagesByGuestIdResult(
      items,
      total,
      query.page,
      query.limit,
    );
  }
}
