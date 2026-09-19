import {
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { GuestEmail } from '@/domain/guest-email/entities/guest-email.entity';
import { GUEST_EMAIL_REPOSITORY } from '@/domain/guest-email/repositories/guest-email.repository';
import type { GuestEmailRepository } from '@/domain/guest-email/repositories/guest-email.repository';
import { GUEST_REPOSITORY } from '@/domain/guest/repositories/guest.repository';
import type { GuestRepository } from '@/domain/guest/repositories/guest.repository';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { SaveGuestEmailCommand } from './save-guest-email.command';

@CommandHandler(SaveGuestEmailCommand)
export class SaveGuestEmailHandler implements ICommandHandler<SaveGuestEmailCommand> {
  constructor(
    @Inject(GUEST_EMAIL_REPOSITORY)
    private readonly guestEmailRepository: GuestEmailRepository,
    @Inject(GUEST_REPOSITORY)
    private readonly guestRepository: GuestRepository,
  ) {}

  async execute(command: SaveGuestEmailCommand): Promise<{ id: string }> {
    if (!command.tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }

    if (!command.subject || command.subject.trim() === '') {
      throw new BadRequestException('Email subject cannot be empty');
    }

    const tenantId = TenantId.createFromString(command.tenantId);
    const guestId = GuestId.createFromString(command.guestId);

    const guest = await this.guestRepository.findById(guestId);
    if (!guest) {
      throw new NotFoundException('Guest not found');
    }

    if (!guest.getTenantId().equals(tenantId)) {
      throw new ForbiddenException('Not authorized for this guest tenant');
    }

    // El modelo GuestEmail ya no recibe el cuerpo (body) por política de optimización
    const guestEmail = GuestEmail.create({
      tenantId,
      guestId,
      subject: command.subject,
      status: command.status,
      attachments: command.attachments,
      sentById: command.sentById,
    });

    await this.guestEmailRepository.save(guestEmail);

    return { id: guestEmail.getId().toString() };
  }
}
