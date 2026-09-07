import { Injectable } from '@nestjs/common';
import { Conversation } from '@/domain/conversation/entities/conversation.entity';
import {
  ConversationFilters,
  ConversationRepository,
} from '@/domain/conversation/repositories/conversation.repository';
import { ConversationId } from '@/domain/conversation/value-objects/conversation-id.vo';
import { ConversationStatus } from '@/domain/conversation/value-objects/conversation-status.vo';
import { GuestMessageChannel } from '@/domain/guest-message/value-objects/guest-message-channel.vo';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import {
  Prisma,
  type conversations as ConversationRow,
} from '@/infrastructure/persistence/prisma/generated/client';

@Injectable()
export class PrismaConversationRepository implements ConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(conversation: Conversation): Promise<void> {
    const id = conversation.getId().toString();

    const mutable = {
      reservation_id: conversation.getReservationId(),
      channels: conversation.getChannels(),
      subject: conversation.getSubject(),
      last_message_at: conversation.getLastMessageAt(),
      last_message_preview: conversation.getLastMessagePreview(),
      unread_count_for_staff: conversation.getUnreadCountForStaff(),
      unread_count_for_guest: conversation.getUnreadCountForGuest(),
      status: conversation.getStatus(),
    };

    // the id is minted in the domain (ConversationId.create), so this is an upsert
    await this.prisma.conversations.upsert({
      where: { id },
      update: { ...mutable, updated_at: new Date() },
      create: {
        ...mutable,
        id,
        tenant_id: conversation.getTenantId(),
        guest_id: conversation.getGuestId(),
        created_at: conversation.getCreatedAt(),
      },
    });
  }

  async findById(id: ConversationId): Promise<Conversation | null> {
    const row = await this.prisma.conversations.findUnique({
      where: { id: id.toString() },
    });
    return row ? this.toDomainEntity(row) : null;
  }

  async findByTenantAndGuest(
    tenantId: string,
    guestId: string,
  ): Promise<Conversation | null> {
    const row = await this.prisma.conversations.findFirst({
      where: { tenant_id: tenantId, guest_id: guestId },
    });
    return row ? this.toDomainEntity(row) : null;
  }

  async findByTenantPaginated(
    tenantId: string,
    filters: ConversationFilters,
    page: number,
    limit: number,
  ): Promise<{ conversations: Conversation[]; total: number }> {
    const where: Prisma.conversationsWhereInput = {
      tenant_id: tenantId,
      ...(filters.channel ? { channels: { has: filters.channel } } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.unreadOnly ? { unread_count_for_staff: { gt: 0 } } : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.conversations.count({ where }),
      this.prisma.conversations.findMany({
        where,
        orderBy: { last_message_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      conversations: rows.map((row) => this.toDomainEntity(row)),
      total,
    };
  }

  async findByGuestId(
    tenantId: string,
    guestId: string,
  ): Promise<Conversation[]> {
    const rows = await this.prisma.conversations.findMany({
      where: { tenant_id: tenantId, guest_id: guestId },
      orderBy: { last_message_at: 'desc' },
    });
    return rows.map((row) => this.toDomainEntity(row));
  }

  private toDomainEntity(row: ConversationRow): Conversation {
    return Conversation.reconstitute({
      id: ConversationId.createFromString(row.id),
      tenantId: row.tenant_id,
      guestId: row.guest_id,
      reservationId: row.reservation_id,
      channels: row.channels as GuestMessageChannel[],
      subject: row.subject,
      lastMessageAt: row.last_message_at,
      lastMessagePreview: row.last_message_preview,
      unreadCountForStaff: row.unread_count_for_staff,
      unreadCountForGuest: row.unread_count_for_guest,
      status: row.status as ConversationStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
