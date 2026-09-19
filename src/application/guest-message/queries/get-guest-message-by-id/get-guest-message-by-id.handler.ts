import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { MESSAGE_BODY_PROVIDER } from '@/application/shared/services/message-body-provider.service';
import type { IMessageBodyProvider } from '@/application/shared/services/message-body-provider.service';
import { GUEST_MESSAGE_REPOSITORY } from '@/domain/guest-message/repositories/guest-message.repository';
import type { GuestMessageRepository } from '@/domain/guest-message/repositories/guest-message.repository';
import { GuestMessageId } from '@/domain/guest-message/value-objects/guest-message-id.vo';
import { GetGuestMessageByIdQuery } from './get-guest-message-by-id.query';
import { GuestMessageDetailDto } from './get-guest-message-by-id.result';

@QueryHandler(GetGuestMessageByIdQuery)
export class GetGuestMessageByIdHandler
  implements IQueryHandler<GetGuestMessageByIdQuery, GuestMessageDetailDto>
{
  constructor(
    @Inject(GUEST_MESSAGE_REPOSITORY)
    private readonly guestMessageRepository: GuestMessageRepository,
    @Inject(MESSAGE_BODY_PROVIDER)
    private readonly messageBodyProvider: IMessageBodyProvider,
  ) {}

  async execute(query: GetGuestMessageByIdQuery): Promise<GuestMessageDetailDto> {
    const message = await this.guestMessageRepository.findById(
      GuestMessageId.createFromString(query.messageId),
    );

    if (message?.getTenantId().toString() !== query.tenantId) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    let body: string | null = null;
    const providerMessageId = message.getProviderMessageId();
    if (providerMessageId) {
      body = await this.messageBodyProvider.getBody(providerMessageId);
    }
    body ??= message.getPreview();

    return {
      id: message.getId().toString(),
      guestId: message.getGuestId().toString(),
      channel: message.getChannel(),
      direction: message.getDirection(),
      status: message.getStatus(),
      preview: message.getPreview(),
      body,
      sentBy: message.getSentBy(),
      providerMessageId: message.getProviderMessageId(),
      attachments: message.getAttachments().map((att) => ({
        url: att.url,
        name: att.name,
        type: att.type,
      })),
      createdAt: message.getCreatedAt(),
    };
  }
}
