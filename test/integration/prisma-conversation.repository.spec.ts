import { PrismaConversationRepository } from '@/infrastructure/persistence/repositories/prisma-conversation.repository';
import { Conversation } from '@/domain/conversation/entities/conversation.entity';
import { ConversationStatus } from '@/domain/conversation/value-objects/conversation-status.vo';
import { prisma, resetDatabase } from './prisma.helper';
import { seedGuest, seedTenant } from './fixtures';

describe('PrismaConversationRepository', () => {
  const repo = new PrismaConversationRepository(prisma);

  let tenantId: string;
  let guestId: string;

  beforeEach(async () => {
    await resetDatabase();
    tenantId = (await seedTenant()).id;
    guestId = (await seedGuest(tenantId)).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const newConversation = (subject = 'Booking question') =>
    Conversation.create({ tenantId, guestId, subject });

  it('upserts on the domain-minted id rather than inserting twice', async () => {
    const conversation = newConversation();
    await repo.save(conversation);
    await repo.save(conversation);

    expect(await prisma.conversations.count()).toBe(1);

    const found = (await repo.findById(conversation.getId()))!;
    expect(found.getSubject()).toBe('Booking question');
    expect(found.getStatus()).toBe(ConversationStatus.OPEN);
    expect(found.getChannels()).toEqual([]);
    expect(found.getUnreadCountForStaff()).toBe(0);
  });

  it('persists status changes through the same id', async () => {
    const conversation = newConversation();
    await repo.save(conversation);

    conversation.archive();
    await repo.save(conversation);

    expect(await prisma.conversations.count()).toBe(1);
    expect((await repo.findById(conversation.getId()))!.getStatus()).toBe(
      ConversationStatus.ARCHIVED,
    );
  });

  it('filters by status and unreadOnly, newest activity first', async () => {
    const open = newConversation('open one');
    const archived = newConversation('archived one');
    archived.archive();
    await repo.save(open);
    await repo.save(archived);

    await prisma.conversations.update({
      where: { id: open.getId().toString() },
      data: { unread_count_for_staff: 2, last_message_at: new Date() },
    });

    expect(
      (await repo.findByTenantPaginated(tenantId, {}, 1, 10)).total,
    ).toBe(2);
    expect(
      (
        await repo.findByTenantPaginated(
          tenantId,
          { status: ConversationStatus.OPEN },
          1,
          10,
        )
      ).total,
    ).toBe(1);
    expect(
      (await repo.findByTenantPaginated(tenantId, { unreadOnly: true }, 1, 10))
        .total,
    ).toBe(1);

    const page = await repo.findByTenantPaginated(tenantId, {}, 1, 10);
    expect(page.conversations[0].getSubject()).toBe('open one');
  });

  it('finds by tenant + guest and scopes to the tenant', async () => {
    const conversation = newConversation();
    await repo.save(conversation);

    expect(await repo.findByTenantAndGuest(tenantId, guestId)).not.toBeNull();
    expect(await repo.findByGuestId(tenantId, guestId)).toHaveLength(1);

    const other = await seedTenant({ name: 'Andina' });
    expect(await repo.findByTenantAndGuest(other.id, guestId)).toBeNull();
    expect(await repo.findByGuestId(other.id, guestId)).toEqual([]);
  });
});
