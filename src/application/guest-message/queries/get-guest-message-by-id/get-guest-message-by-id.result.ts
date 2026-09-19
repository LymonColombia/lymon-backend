export class GuestMessageDetailDto {
  id: string;
  guestId: string;
  channel: string;
  direction: string;
  status: string;
  preview: string;
  body: string | null;
  sentBy: { actorId: string; actorEmail: string };
  providerMessageId: string | null;
  attachments: { url: string; name: string; type?: string }[];
  createdAt: Date;
}
