import { PrismaGuestMessageRepository } from '@/infrastructure/persistence/repositories/prisma-guest-message.repository';
import { GuestMessage } from '@/domain/guest-message/entities/guest-message.entity';
import { GuestMessageChannel } from '@/domain/guest-message/value-objects/guest-message-channel.vo';
import { GuestMessageDirection } from '@/domain/guest-message/value-objects/guest-message-direction.vo';
import { GuestMessageStatus } from '@/domain/guest-message/value-objects/guest-message-status.vo';
import { Conversation } from '@/domain/conversation/entities/conversation.entity';
import { PrismaConversationRepository } from '@/infrastructure/persistence/repositories/prisma-conversation.repository';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { prisma, resetDatabase } from './prisma.helper';
import { seedGuest, seedTenant, seedUser } from './fixtures';

describe('PrismaGuestMessageRepository', () => {
  const repo = new PrismaGuestMessageRepository(prisma);
  const conversations = new PrismaConversationRepository(prisma);

  let tenantId: string;
  let guestId: string;
  let userId: string;

  beforeEach(async () => {
    await resetDatabase();
    tenantId = (await seedTenant()).id;
    guestId = (await seedGuest(tenantId)).id;
    userId = (await seedUser(tenantId)).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const outbound = (
    overrides: Partial<{ preview: string; providerMessageId: string; conversationId: string }> = {},
  ) =>
    GuestMessage.create({
      tenantId: TenantId.createFromString(tenantId),
      guestId: GuestId.createFromString(guestId),
      channel: GuestMessageChannel.EMAIL,
      direction: GuestMessageDirection.OUTBOUND,
      status: GuestMessageStatus.SENT,
      from: 'staff@costa.com',
      to: ['ana@example.com'],
      sentBy: { actorId: userId, actorEmail: 'staff@costa.com' },
      attachments: [{ url: 'https://x/y.pdf', name: 'invoice.pdf', type: 'application/pdf' }],
      preview: overrides.preview ?? 'Hello Ana',
      body: 'Hello Ana, your booking is confirmed.',
      providerMessageId: overrides.providerMessageId,
      provider: overrides.providerMessageId ? 'brevo' : undefined,
      conversationId: overrides.conversationId,
    });

  it('upserts on the domain-minted id and round-trips jsonb attachments', async () => {
    const message = outbound();
    await repo.save(message);
    await repo.save(message);

    expect(await prisma.guest_messages.count()).toBe(1);

    const found = (await repo.findById(message.getId()))!;
    expect(found.getPreview()).toBe('Hello Ana');
    expect(found.getTo()).toEqual(['ana@example.com']);
    expect(found.getAttachments()).toEqual([
      { url: 'https://x/y.pdf', name: 'invoice.pdf', type: 'application/pdf' },
    ]);
    expect(found.getSentBy()).toEqual({
      actorId: userId,
      actorEmail: 'staff@costa.com',
    });
  });

  it('maps an absent staff actor to null columns and back to empty strings', async () => {
    const inbound = GuestMessage.create({
      tenantId: TenantId.createFromString(tenantId),
      guestId: GuestId.createFromString(guestId),
      channel: GuestMessageChannel.EMAIL,
      direction: GuestMessageDirection.INBOUND,
      status: GuestMessageStatus.DELIVERED,
      from: 'ana@example.com',
      to: ['staff@costa.com'],
      sentBy: { actorId: '', actorEmail: '' },
      preview: 'Question',
    });
    await repo.save(inbound);

    const row = (await prisma.guest_messages.findFirst())!;
    expect(row.sent_by_actor_id).toBeNull();
    expect(row.sent_by_actor_email).toBeNull();

    const found = (await repo.findById(inbound.getId()))!;
    expect(found.getSentBy()).toEqual({ actorId: '', actorEmail: '' });
    expect(found.getAttachments()).toEqual([]);
  });

  it('finds by provider message id', async () => {
    await repo.save(outbound({ providerMessageId: 'brevo-123' }));

    expect(await repo.findByProviderMessageId('brevo-123')).not.toBeNull();
    expect(await repo.findByProviderMessageId('nope')).toBeNull();
  });

  it('lists a conversation oldest first and a guest newest first', async () => {
    const conversation = Conversation.create({ tenantId, guestId, subject: 'Thread' });
    await conversations.save(conversation);
    const conversationId = conversation.getId().toString();

    const first = outbound({ preview: 'first', conversationId });
    await repo.save(first);
    const second = outbound({ preview: 'second', conversationId });
    await prisma.guest_messages.create({
      data: {
        id: second.getId().toString(),
        tenant_id: tenantId,
        guest_id: guestId,
        conversation_id: conversationId,
        channel: 'email',
        direction: 'outbound',
        status: 'sent',
        from_address: 'staff@costa.com',
        to_addresses: ['ana@example.com'],
        preview: 'second',
        created_at: new Date(Date.now() + 1000),
      },
    });

    expect(
      (await repo.findByConversationId(tenantId, conversationId)).map((m) => m.getPreview()),
    ).toEqual(['first', 'second']);

    expect(
      (
        await repo.findByGuestId(
          TenantId.createFromString(tenantId),
          GuestId.createFromString(guestId),
        )
      ).map((m) => m.getPreview()),
    ).toEqual(['second', 'first']);

    const page = await repo.findByGuestIdPaginated(
      TenantId.createFromString(tenantId),
      GuestId.createFromString(guestId),
      1,
      1,
    );
    expect(page.total).toBe(2);
    expect(page.messages).toHaveLength(1);
  });
});
