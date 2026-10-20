import { Injectable } from '@nestjs/common';
import { GuestMessage } from '@/domain/guest-message/entities/guest-message.entity';
import { GuestMessageAttachment } from '@/domain/guest-message/entities/guest-message.types';
import { GuestMessageRepository } from '@/domain/guest-message/repositories/guest-message.repository';
import { GuestMessageId } from '@/domain/guest-message/value-objects/guest-message-id.vo';
import { GuestMessageChannel } from '@/domain/guest-message/value-objects/guest-message-channel.vo';
import { GuestMessageDirection } from '@/domain/guest-message/value-objects/guest-message-direction.vo';
import { GuestMessageStatus } from '@/domain/guest-message/value-objects/guest-message-status.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import {
  Prisma,
  type guest_messages as GuestMessageRow,
} from '@/infrastructure/persistence/prisma/generated/client';

@Injectable()
export class PrismaGuestMessageRepository implements GuestMessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(message: GuestMessage): Promise<void> {
    const id = message.getId().toString();
    const sentBy = message.getSentBy();

    const mutable = {
      channel: message.getChannel(),
      direction: message.getDirection(),
      status: message.getStatus(),
      from_address: message.getFrom(),
      to_addresses: message.getTo(),
      reservation_id: message.getReservationId(),
      provider: message.getProvider(),
      provider_message_id: message.getProviderMessageId(),
      template_id: message.getTemplateId(),
      // inbound messages have no staff actor; the columns are nullable, the VO is not
      sent_by_actor_id: sentBy.actorId || null,
      sent_by_actor_email: sentBy.actorEmail || null,
      attachments: message.getAttachments() as unknown as Prisma.InputJsonValue,
      preview: message.getPreview(),
      body: message.getBody(),
      body_html: message.getBodyHtml(),
      failure_reason: message.getFailureReason(),
      conversation_id: message.getConversationId(),
      deleted_at: message.getDeletedAt(),
    };

    // the id is minted in the domain (GuestMessageId.create), so this is an upsert
    await this.prisma.guest_messages.upsert({
      where: { id },
      update: { ...mutable, updated_at: new Date() },
      create: {
        ...mutable,
        id,
        tenant_id: message.getTenantId().toString(),
        guest_id: message.getGuestId().toString(),
        created_at: message.getCreatedAt(),
      },
    });
  }

  async findById(id: GuestMessageId): Promise<GuestMessage | null> {
    const row = await this.prisma.guest_messages.findUnique({
      where: { id: id.toString() },
    });
    return row ? this.toDomainEntity(row) : null;
  }

  async findByGuestId(
    tenantId: TenantId,
    guestId: GuestId,
  ): Promise<GuestMessage[]> {
    const rows = await this.prisma.guest_messages.findMany({
      where: {
        tenant_id: tenantId.toString(),
        guest_id: guestId.toString(),
      },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((row) => this.toDomainEntity(row));
  }

  async findByGuestIdPaginated(
    tenantId: TenantId,
    guestId: GuestId,
    page: number,
    limit: number,
  ): Promise<{ messages: GuestMessage[]; total: number }> {
    const where = {
      tenant_id: tenantId.toString(),
      guest_id: guestId.toString(),
    };

    const [total, rows] = await Promise.all([
      this.prisma.guest_messages.count({ where }),
      this.prisma.guest_messages.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { messages: rows.map((row) => this.toDomainEntity(row)), total };
  }

  async findByProviderMessageId(
    providerMessageId: string,
  ): Promise<GuestMessage | null> {
    const row = await this.prisma.guest_messages.findFirst({
      where: { provider_message_id: providerMessageId },
    });
    return row ? this.toDomainEntity(row) : null;
  }

  async findByConversationId(
    tenantId: string,
    conversationId: string,
  ): Promise<GuestMessage[]> {
    const rows = await this.prisma.guest_messages.findMany({
      where: { tenant_id: tenantId, conversation_id: conversationId },
      orderBy: { created_at: 'asc' },
    });
    return rows.map((row) => this.toDomainEntity(row));
  }

  private toDomainEntity(row: GuestMessageRow): GuestMessage {
    return GuestMessage.reconstitute({
      id: GuestMessageId.createFromString(row.id),
      tenantId: TenantId.createFromString(row.tenant_id),
      guestId: GuestId.createFromString(row.guest_id),
      channel: row.channel as GuestMessageChannel,
      direction: row.direction as GuestMessageDirection,
      status: row.status as GuestMessageStatus,
      from: row.from_address,
      to: row.to_addresses,
      reservationId: row.reservation_id,
      provider: row.provider,
      providerMessageId: row.provider_message_id,
      templateId: row.template_id,
      sentBy: {
        actorId: row.sent_by_actor_id ?? '',
        actorEmail: row.sent_by_actor_email ?? '',
      },
      attachments: row.attachments as unknown as GuestMessageAttachment[],
      preview: row.preview,
      body: row.body,
      bodyHtml: row.body_html,
      failureReason: row.failure_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      conversationId: row.conversation_id,
    });
  }
}
