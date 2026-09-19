import { UpdateIncidentReportCommand } from '@/application/incident-report/commands/update-incident-report.command';
import { UpdateIncidentReportResult } from '@/application/incident-report/commands/update-incident-report.result';
import {
  INCIDENT_REPORT_REPOSITORY,
  type IncidentReportRepository,
} from '@/domain/incident-report/repositories/incident-report.repository';
import { IncidentReportId } from '@/domain/incident-report/value-objects/incident-report-id.vo';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import {
  AuditLoggedEvent,
  AUDIT_LOG_EVENT,
} from '@/infrastructure/audit/events/audit-logged.event';
import { ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';

@CommandHandler(UpdateIncidentReportCommand)
export class UpdateIncidentReportHandler implements ICommandHandler<UpdateIncidentReportCommand> {
  constructor(
    @Inject(INCIDENT_REPORT_REPOSITORY)
    private readonly reportRepository: IncidentReportRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    command: UpdateIncidentReportCommand,
  ): Promise<UpdateIncidentReportResult> {
    const report = await this.reportRepository.findById(
      IncidentReportId.create(command.reportId),
    );

    if (report?.getTenantId() !== command.tenantId) {
      throw new NotFoundException(
        `IncidentReport with id "${command.reportId}" not found`,
      );
    }

    if (!command.canManageAll && report.getCreatedBy() !== command.actorId) {
      throw new ForbiddenException(
        'STAFF can only edit their own incident reports',
      );
    }

    report.update(command.title, command.description, command.attachmentUrls);
    await this.reportRepository.save(report);

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId,
        command.actorId,
        command.actorEmail,
        AuditAction.INCIDENT_REPORT_UPDATED,
        AuditEntityType.INCIDENT_REPORT,
        command.reportId,
      ),
    );

    return new UpdateIncidentReportResult(command.reportId);
  }
}
