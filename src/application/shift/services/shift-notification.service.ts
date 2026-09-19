import { Injectable, Inject } from '@nestjs/common';
import {
  EMAIL_SERVICE,
  type IEmailService,
} from '@/application/shared/services/email.service';
import { EmailTemplateService } from '@/infrastructure/common/email-template.service';

export interface StaffMember {
  getTenantId(): unknown;
  isOwner(): boolean;
  getEmail(): { toString(): string };
}

export interface ShiftForNotification {
  getName(): string;
  getEndDate(): Date | null;
  getStartDate(): Date;
  getStartHour(): string;
  getEndHour(): string;
  getNotes(): string | null;
}

export interface PropertyForNotification {
  getName(): string;
}

@Injectable()
export class ShiftNotificationService {
  constructor(
    @Inject(EMAIL_SERVICE)
    private readonly emailService: IEmailService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  async sendShiftUpdatedEmail(
    staffMembers: StaffMember[],
    shift: ShiftForNotification,
    property: PropertyForNotification,
  ): Promise<void> {
    const htmlContent = this.emailTemplateService.renderShiftUpdatedTemplate({
      name: shift.getName(),
      startDate: shift.getStartDate(),
      endDate: shift.getEndDate(),
      startHour: shift.getStartHour(),
      endHour: shift.getEndHour(),
      propertyName: property.getName(),
      notes: shift.getNotes(),
    });

    await this.emailService.sendEmail({
      to: staffMembers.map((staffMember) => ({
        email: staffMember.getEmail().toString(),
        name: staffMember.getEmail().toString(),
      })),
      subject: 'Shift updated',
      htmlContent,
    });
  }

  async sendStaffAssignedToShiftEmail(
    staffMembers: StaffMember[],
    shift: ShiftForNotification,
  ): Promise<void> {
    const htmlContent = `
      <div style="font-family: sans-serif; line-height: 1.6;">
        <p><strong>Shift:</strong> ${shift.getName()}</p>
        <p>You have been assigned to a shift.</p>
        <p><strong>Date range:</strong> ${shift.getStartDate().toISOString().split('T')[0]} - ${shift.getEndDate()?.toISOString().split('T')[0] ?? 'No end date'}</p>
        <p><strong>Time:</strong> ${shift.getStartHour()} - ${shift.getEndHour()}</p>
        ${shift.getNotes() ? `<p><strong>Notes:</strong> ${shift.getNotes()}</p>` : ''}
      </div>
    `;

    await this.emailService.sendEmail({
      to: staffMembers.map((staffMember) => ({
        email: staffMember.getEmail().toString(),
        name: staffMember.getEmail().toString(),
      })),
      subject: 'You have been assigned to a shift',
      htmlContent,
    });
  }
}
