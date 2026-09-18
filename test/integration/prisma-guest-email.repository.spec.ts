import { PrismaGuestEmailRepository } from '@/infrastructure/persistence/repositories/prisma-guest-email.repository';
import { GuestEmail } from '@/domain/guest-email/entities/guest-email.entity';
import { GuestEmailStatusEnum } from '@/domain/guest-email/value-objects/guest-email-status.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { prisma, resetDatabase } from './prisma.helper';
import { seedGuest, seedTenant, seedUser } from './fixtures';

describe('PrismaGuestEmailRepository', () => {
  const repo = new PrismaGuestEmailRepository(prisma);

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

  const newEmail = (subject = 'Your booking') =>
    GuestEmail.create({
      tenantId: TenantId.createFromString(tenantId),
      guestId: GuestId.createFromString(guestId),
      subject,
      status: GuestEmailStatusEnum.PENDING,
      attachments: [{ url: 'https://x/y.pdf', name: 'invoice.pdf', type: 'application/pdf' }],
      sentById: userId,
    });

  it('upserts on the domain-minted id and round-trips attachments', async () => {
    const email = newEmail();
    await repo.save(email);
    await repo.save(email);

    expect(await prisma.guest_emails.count()).toBe(1);

    const found = (await repo.findById(email.getId()))!;
    expect(found.getSubject()).toBe('Your booking');
    expect(found.getStatus()).toBe(GuestEmailStatusEnum.PENDING);
    expect(found.getSentById()).toBe(userId);
    expect(found.getMessageId()).toBeNull();
    expect(found.getAttachments()).toEqual([
      { url: 'https://x/y.pdf', name: 'invoice.pdf', type: 'application/pdf' },
    ]);
  });

  it('persists a status transition through the same row', async () => {
    const email = newEmail();
    await repo.save(email);

    email.updateStatus(GuestEmailStatusEnum.SENT);
    email.updateMessageId('provider-123');
    await repo.save(email);

    expect(await prisma.guest_emails.count()).toBe(1);
    const found = (await repo.findById(email.getId()))!;
    expect(found.getStatus()).toBe(GuestEmailStatusEnum.SENT);
    expect(found.getMessageId()).toBe('provider-123');
  });

  it('lists newest first, paginates and scopes to the tenant', async () => {
    await repo.save(newEmail('first'));
    await repo.save(newEmail('second'));

    const tenant = TenantId.createFromString(tenantId);
    const guest = GuestId.createFromString(guestId);

    expect(await repo.findByGuestId(tenant, guest)).toHaveLength(2);

    const page = await repo.findByGuestIdPaginated(tenant, guest, 1, 1);
    expect(page.total).toBe(2);
    expect(page.emails).toHaveLength(1);

    const other = TenantId.createFromString((await seedTenant({ name: 'Andina' })).id);
    expect(await repo.findByGuestId(other, guest)).toEqual([]);
  });
});
