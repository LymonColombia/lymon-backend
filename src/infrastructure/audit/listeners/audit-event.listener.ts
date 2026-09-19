import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CommandBus } from '@nestjs/cqrs';
import {
  AuditLoggedEvent,
  AUDIT_LOG_EVENT,
} from '../events/audit-logged.event';
import { LogAuditEventCommand } from '@/application/audit/commands/log-audit-event.command';

@Injectable()
export class AuditEventListener {
  private readonly logger = new Logger(AuditEventListener.name);

  constructor(private readonly commandBus: CommandBus) {}

  @OnEvent(AUDIT_LOG_EVENT)
  async handle(event: AuditLoggedEvent): Promise<void> {
    try {
      await this.commandBus.execute(
        new LogAuditEventCommand(
          event.tenantId,
          event.userId,
          event.userEmail,
          event.action,
          event.entityType,
          event.entityId,
          event.metadata,
          event.previousValue,
          event.newValue,
          event.ipAddress,
        ),
      );
    } catch (error) {
      this.logger.error('AuditEventListener failed to dispatch command', error);
    }
  }
}
