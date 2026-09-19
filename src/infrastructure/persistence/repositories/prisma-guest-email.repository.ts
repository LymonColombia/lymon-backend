import { Injectable } from '@nestjs/common';
import { GuestEmail } from '@/domain/guest-email/entities/guest-email.entity';
import { GuestEmailAttachment } from '@/domain/guest-email/entities/guest-email.types';
import { GuestEmailRepository } from '@/domain/guest-email/repositories/guest-email.repository';
import { GuestEmailId } from '@/domain/guest-email/value-objects/guest-email-id.vo';
import { GuestEmailStatusEnum } from '@/domain/guest-email/value-objects/guest-email-status.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import {
  Prisma,
  type guest_emails as GuestEmailRow,
} from '@/infrastructure/persistence/prisma/generated/client';

@Injectable()
export class PrismaGuestEmailRepository implements GuestEmailRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(email: GuestEmail): Promise<void> {
    const id = email.getId().toString();

    const mutable = {
      subject: email.getSubject(),
      status: email.getStatus(),
      message_id: email.getMessageId(),
      attachments: email.getAttachments() as unknown as Prisma.InputJsonValue,
      sent_by_id: email.getSentById(),
    };

    // the id is minted in the domain (GuestEmailId.create), so this is an upsert
    await this.prisma.guest_emails.upsert({
      where: { id },
      update: mutable,
      create: {
        ...mutable,
        id,
        tenant_id: email.getTenantId().toString(),
        guest_id: email.getGuestId().toString(),
        created_at: email.getCreatedAt(),
      },
    });
  }

  async findById(id: GuestEmailId): Promise<GuestEmail | null> {
    const row = await this.prisma.guest_emails.findUnique({
      where: { id: id.toString() },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByGuestId(
    tenantId: TenantId,
    guestId: GuestId,
  ): Promise<GuestEmail[]> {
    const rows = await this.prisma.guest_emails.findMany({
      where: { tenant_id: tenantId.toString(), guest_id: guestId.toString() },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findByGuestIdPaginated(
    tenantId: TenantId,
    guestId: GuestId,
    page: number,
    limit: number,
  ): Promise<{ emails: GuestEmail[]; total: number }> {
    const where = {
      tenant_id: tenantId.toString(),
      guest_id: guestId.toString(),
    };

    const [total, rows] = await Promise.all([
      this.prisma.guest_emails.count({ where }),
      this.prisma.guest_emails.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { emails: rows.map((row) => this.toDomain(row)), total };
  }

  private toDomain(row: GuestEmailRow): GuestEmail {
    return GuestEmail.reconstitute({
      id: GuestEmailId.createFromString(row.id),
      tenantId: TenantId.createFromString(row.tenant_id),
      guestId: GuestId.createFromString(row.guest_id),
      subject: row.subject,
      status: row.status as GuestEmailStatusEnum,
      attachments: row.attachments as unknown as GuestEmailAttachment[],
      messageId: row.message_id,
      sentById: row.sent_by_id,
      createdAt: row.created_at,
    });
  }
}
