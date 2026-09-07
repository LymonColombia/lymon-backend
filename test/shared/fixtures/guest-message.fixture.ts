import { GuestMessage } from '@/domain/guest-message/entities/guest-message.entity';
import { GuestMessageId } from '@/domain/guest-message/value-objects/guest-message-id.vo';
import { GuestMessageChannel } from '@/domain/guest-message/value-objects/guest-message-channel.vo';
import { GuestMessageDirection } from '@/domain/guest-message/value-objects/guest-message-direction.vo';
import { GuestMessageStatus } from '@/domain/guest-message/value-objects/guest-message-status.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';

export const GUEST_MESSAGE_FIXTURE_DEFAULTS = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
  guestId: '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
  channel: GuestMessageChannel.EMAIL,
  direction: GuestMessageDirection.OUTBOUND,
  status: GuestMessageStatus.PENDING,
  from: '',
  to: ['john@example.com'],
  reservationId: null,
  provider: null,
  providerMessageId: null,
  templateId: null,
  sentBy: { actorId: 'actor-001', actorEmail: 'actor@example.com' },
  attachments: [],
  preview: 'Hello, this is a test message',
  body: null,
  bodyHtml: null,
  failureReason: null,
  createdAt: new Date('2026-01-01T10:00:00Z'),
  updatedAt: new Date('2026-01-01T10:00:00Z'),
  deletedAt: null,
};

export function makeGuestMessage(
  overrides?: Partial<{
    id: string;
    tenantId: string;
    guestId: string;
    channel: GuestMessageChannel;
    direction: GuestMessageDirection;
    status: GuestMessageStatus;
    from: string;
    to: string[];
    reservationId: string | null;
    provider: string | null;
    providerMessageId: string | null;
    templateId: string | null;
    sentBy: { actorId: string; actorEmail: string };
    attachments: { url: string; name: string; type?: string }[];
    preview: string;
    body: string | null;
    bodyHtml: string | null;
    failureReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }>,
): GuestMessage {
  const merged = { ...GUEST_MESSAGE_FIXTURE_DEFAULTS, ...overrides };

  return GuestMessage.reconstitute({
    id: GuestMessageId.createFromString(merged.id),
    tenantId: TenantId.createFromString(merged.tenantId),
    guestId: GuestId.createFromString(merged.guestId),
    channel: merged.channel,
    direction: merged.direction,
    status: merged.status,
    from: merged.from,
    to: merged.to,
    reservationId: merged.reservationId,
    provider: merged.provider,
    providerMessageId: merged.providerMessageId,
    templateId: merged.templateId,
    sentBy: merged.sentBy,
    attachments: merged.attachments,
    preview: merged.preview,
    body: merged.body,
    bodyHtml: merged.bodyHtml,
    failureReason: merged.failureReason,
    createdAt: merged.createdAt,
    updatedAt: merged.updatedAt,
    deletedAt: merged.deletedAt,
  });
}
