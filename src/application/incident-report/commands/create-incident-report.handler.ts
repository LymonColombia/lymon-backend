import { CreateIncidentReportCommand } from '@/application/incident-report/commands/create-incident-report.command';
import { CreateIncidentReportResult } from '@/application/incident-report/commands/create-incident-report.result';
import { IncidentReport } from '@/domain/incident-report/entities/incident-report.entity';
import {
  INCIDENT_REPORT_REPOSITORY,
  type IncidentReportRepository,
} from '@/domain/incident-report/repositories/incident-report.repository';
import {
  PROPERTY_REPOSITORY,
  type PropertyRepository,
} from '@/domain/property/repositories/property.repository';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
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

@CommandHandler(CreateIncidentReportCommand)
export class CreateIncidentReportHandler implements ICommandHandler<CreateIncidentReportCommand> {
  constructor(
    @Inject(INCIDENT_REPORT_REPOSITORY)
    private readonly reportRepository: IncidentReportRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    command: CreateIncidentReportCommand,
  ): Promise<CreateIncidentReportResult> {
    const tenantId = TenantId.createFromString(command.tenantId);
    const property = await this.propertyRepository.findById(
      PropertyId.create(command.propertyId),
    );
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (!property.getTenantId().equals(tenantId)) {
      throw new ForbiddenException('Property does not belong to this tenant');
    }

    const report = IncidentReport.create(
      command.tenantId,
      command.propertyId,
      command.actorId,
      command.title,
      command.description,
      command.attachmentUrls,
    );

    const reportId = await this.reportRepository.save(report);

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId,
        command.actorId,
        command.actorEmail,
        AuditAction.INCIDENT_REPORT_CREATED,
        AuditEntityType.INCIDENT_REPORT,
        reportId,
        {
          createdBy: command.actorId,
          propertyId: command.propertyId,
          title: command.title,
        },
      ),
    );

    return new CreateIncidentReportResult(reportId);
  }
}
