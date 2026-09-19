import * as crypto from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import {
  GUEST_REPOSITORY,
  type GuestRepository,
} from '@/domain/guest/repositories/guest.repository';
import {
  EMAIL_SERVICE,
  type IEmailService,
} from '@/application/shared/services/email.service';
import { UpdateGuestProfileCommand } from './update-guest-profile.command';

@CommandHandler(UpdateGuestProfileCommand)
export class UpdateGuestProfileHandler implements ICommandHandler<UpdateGuestProfileCommand> {
  constructor(
    @Inject(GUEST_REPOSITORY)
    private readonly guestRepository: GuestRepository,
    @Inject(EMAIL_SERVICE)
    private readonly emailService: IEmailService,
  ) {}

  async execute(command: UpdateGuestProfileCommand): Promise<void> {
    const guestId = GuestId.createFromString(command.guestId);
    const guest = await this.guestRepository.findById(guestId);

    if (!guest) {
      throw new NotFoundException(`Guest with ID ${command.guestId} not found`);
    }

    if (guest.getTenantId().toString() !== command.tenantId) {
      throw new ForbiddenException(
        'You do not have permission to modify this guest',
      );
    }

    if (command.fullName !== undefined) {
      guest.updateBasicInfo(
        command.fullName,
        command.firstName === undefined
          ? guest.getFirstName()
          : command.firstName,
        command.lastName === undefined ? guest.getLastName() : command.lastName,
      );
    }

    if (command.phone !== undefined) {
      guest.setPhone(command.phone);
    }

    if (command.identity !== undefined) {
      guest.setIdentity(command.identity);
    }

    if (command.primaryEmail !== undefined) {
      const tenantId = TenantId.createFromString(command.tenantId);
      const existing = await this.guestRepository.findByPrimaryEmail(
        tenantId,
        command.primaryEmail,
      );
      if (existing && existing.getId()?.toString() !== command.guestId) {
        throw new ConflictException(
          'A guest with this primary email already exists',
        );
      }

      const plain = crypto.randomBytes(32).toString('hex');
      const hashed = crypto.createHash('sha256').update(plain).digest('hex');
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      guest.initEmailChange(command.primaryEmail, hashed, expiry);
      await this.guestRepository.save(guest);
      await this.emailService.sendVerificationEmail(
        command.primaryEmail,
        plain,
      );
      return;
    }

    await this.guestRepository.save(guest);
  }
}
