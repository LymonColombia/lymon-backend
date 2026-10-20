import {
  BadRequestException,
  ConflictException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateShiftCommand } from './create-shift.command';
import { CreateShiftCommandResult } from './create-shift.result';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { UserId } from '@/domain/user/entities/user.entity';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@/domain/user/repositories/user.repository';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import {
  PROPERTY_REPOSITORY,
  type PropertyRepository,
} from '@/domain/property/repositories/property.repository';
import {
  SHIFT_REPOSITORY,
  type ShiftRepository,
} from '@/domain/shift/repositories/shift.repository';
import { Shift } from '@/domain/shift/entities/shift.entity';
import {
  EMAIL_SERVICE,
  type IEmailService,
} from '@/application/shared/services/email.service';

@CommandHandler(CreateShiftCommand)
export class CreateShiftCommandHandler implements ICommandHandler<CreateShiftCommand> {
  constructor(
    @Inject(SHIFT_REPOSITORY)
    private readonly shiftRepository: ShiftRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    @Inject(EMAIL_SERVICE)
    private readonly emailService: IEmailService,
  ) {}

  async execute(
    command: CreateShiftCommand,
  ): Promise<CreateShiftCommandResult> {
    const tenantId = TenantId.createFromString(command.tenantId);
    const staffMemberIds = this.toDistinctUserIds(command.staffMemberIds);
    const propertyId = PropertyId.create(command.propertyId);

    const staffMembers = await this.getStaffMembers(staffMemberIds, tenantId);

    const property = await this.propertyRepository.findById(propertyId);
    if (!property?.getTenantId().equals(tenantId)) {
      throw new NotFoundException('Property not found for the tenant');
    }

    const startDate = this.parseDate(
      command.startDate,
      'Invalid shift start date',
    );
    const endDate = command.endDate
      ? this.parseDate(command.endDate, 'Invalid shift end date')
      : null;

    if (endDate && endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException(
        'Shift end date cannot be before start date',
      );
    }

    const start = this.toMinutes(command.startHour);
    const end = this.toMinutes(command.endHour);

    for (const staffMemberId of staffMemberIds) {
      const overlappingShift =
        await this.shiftRepository.findOverlappingByStaffInRange(
          tenantId,
          staffMemberId,
          {
            startDate,
            endDate,
            startMinutes: start,
            endMinutes: end,
            weekdays: command.weekdays,
          },
        );

      if (overlappingShift) {
        throw new ConflictException(
          `Staff member ${staffMemberId.toString()} already has an overlapping shift`,
        );
      }
    }

    const shift = Shift.create({
      tenantId,
      staffMemberIds,
      propertyId,
      name: command.name,
      startDate,
      endDate,
      startHour: command.startHour,
      endHour: command.endHour,
      startMinutes: start,
      endMinutes: end,
      weekdays: command.weekdays,
      notes: command.notes,
      createdBy: command.actorId,
      createdByEmail: command.actorEmail,
    });

    const shiftId = await this.shiftRepository.save(shift);

    if (staffMembers.length > 0) {
      await this.emailService.sendEmail({
        to: staffMembers.map((staffMember) => ({
          email: staffMember.getEmail().toString(),
          name: staffMember.getEmail().toString(),
        })),
        subject: 'New shift assigned',
        htmlContent: `
            <div style="font-family: sans-serif; line-height: 1.6;">
              <p><strong>Shift:</strong> ${command.name}</p>
              <p>A new shift has been assigned to you.</p>
              <p><strong>Date range:</strong> ${command.startDate} - ${command.endDate ?? 'No end date'}</p>
              <p><strong>Time:</strong> ${command.startHour} - ${command.endHour}</p>
              <p><strong>Property:</strong> ${property.getName()}</p>
            </div>
          `,
      });
    }

    return new CreateShiftCommandResult(shiftId);
  }

  private toMinutes(value: string): number {
    const [hoursRaw, minutesRaw] = value.split(':');
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new BadRequestException('Invalid shift time format');
    }

    return hours * 60 + minutes;
  }

  private parseDate(value: string, message: string): Date {
    const parsedDate = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(message);
    }
    return parsedDate;
  }

  private toDistinctUserIds(values: string[]): UserId[] {
    if (!values || values.length === 0) {
      return [];
    }

    const uniqueValues = [...new Set(values)];
    return uniqueValues.map((value) => UserId.createFromString(value));
  }

  private async getStaffMembers(
    staffMemberIds: UserId[],
    tenantId: TenantId,
  ): Promise<
    {
      getTenantId(): TenantId;
      isOwner(): boolean;
      getEmail(): { toString(): string };
    }[]
  > {
    const staffMembers = await Promise.all(
      staffMemberIds.map((staffMemberId) =>
        this.userRepository.findById(staffMemberId),
      ),
    );

    for (const element of staffMembers) {
      const staffMember = element;
      if (!staffMember?.getTenantId().equals(tenantId)) {
        throw new NotFoundException('Staff member not found for the tenant');
      }

      if (staffMember.isOwner()) {
        throw new BadRequestException(
          'Shift can only be assigned to a staff member',
        );
      }
    }

    return staffMembers as {
      getTenantId(): TenantId;
      isOwner(): boolean;
      getEmail(): { toString(): string };
    }[];
  }
}
