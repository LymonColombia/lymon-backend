import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateShiftCommandHandler } from '@/application/shift/commands/create-shift/create-shift.handler';
import { UpdateShiftCommandHandler } from '@/application/shift/commands/update-shift/update-shift.handler';
import { AssignStaffToShiftCommandHandler } from '@/application/shift/commands/assign-staff-to-shift/assign-staff-to-shift.handler';
import { UnassignStaffFromShiftCommandHandler } from '@/application/shift/commands/unassign-staff-from-shift/unassign-staff-from-shift.handler';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { EmailModule } from '@/infrastructure/email/email.module';
import { ShiftNotificationService } from '@/application/shift/services/shift-notification.service';
import { ShiftAuditDiffService } from '@/domain/shift/services/shift-audit-diff.service';

const CommandHandlers = [
  CreateShiftCommandHandler,
  UpdateShiftCommandHandler,
  AssignStaffToShiftCommandHandler,
  UnassignStaffFromShiftCommandHandler,
];
const ApplicationServices = [ShiftNotificationService];
const DomainServices = [ShiftAuditDiffService];

@Module({
  imports: [CqrsModule, PersistenceModule, EmailModule],
  providers: [...CommandHandlers, ...ApplicationServices, ...DomainServices],
  exports: [...CommandHandlers, ...ApplicationServices, ...DomainServices],
})
export class ShiftApplicationModule {}
