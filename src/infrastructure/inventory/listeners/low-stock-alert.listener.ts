import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEmailService } from '@/application/shared/services/email.service';
import { EMAIL_SERVICE } from '@/application/shared/services/email.service';
import {
  LowStockAlertEvent,
  LOW_STOCK_ALERT_EVENT,
} from '@/domain/inventory/events/low-stock-alert.event';
import {
  TENANT_REPOSITORY,
  type TenantRepository,
} from '@/domain/tenant/repositories/tenant.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

@Injectable()
export class LowStockAlertListener {
  private readonly logger = new Logger(LowStockAlertListener.name);

  constructor(
    @Inject(EMAIL_SERVICE)
    private readonly emailService: IEmailService,
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: TenantRepository,
  ) {}

  @OnEvent(LOW_STOCK_ALERT_EVENT)
  async handleLowStockAlert(event: LowStockAlertEvent): Promise<void> {
    try {
      const tenantId = TenantId.createFromString(event.tenantId);
      const tenant = await this.tenantRepository.findById(tenantId);
      if (!tenant) {
        this.logger.warn(
          `Tenant ${event.tenantId} not found for low stock alert event`,
        );
        return;
      }

      const ownerEmail = tenant.getOwnerEmail().toString();
      const tenantName = tenant.getName();

      await this.emailService.sendLowStockAlertEmail({
        ownerEmail,
        ownerName: tenantName,
        tenantName,
        propertyName: event.propertyName,
        itemName: event.itemName,
        itemSku: event.itemSku,
        currentStock: event.currentStock,
        minStock: event.minStock,
      });

      this.logger.log(
        `Low stock alert email sent to ${ownerEmail} for item ${event.itemSku}`,
      );
    } catch (error) {
      this.logger.error(
        `LowStockAlertListener failed to send email for item ${event.itemSku}`,
        error,
      );
    }
  }
}
