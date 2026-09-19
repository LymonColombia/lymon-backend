import { ApplicationModule } from '@/application/application.module';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommunicationWebhookModule } from '@/infrastructure/email/communication-webhook.module';
import { CommunicationWebhookController } from './controllers/communication-webhook.controller';
import { AuthController } from '@/presentation/controllers/auth.controller';
import { UserController } from '@/presentation/controllers/user.controller';
import { PropertyController } from '@/presentation/controllers/property.controller';
import { UnitController } from '@/presentation/controllers/unit.controller';
import { AuditController } from '@/presentation/controllers/audit.controller';
import { IncidentReportController } from '@/presentation/controllers/incident-report.controller';
import { TenantController } from '@/presentation/controllers/tenant.controller';
import { GuestAuthController } from '@/presentation/controllers/guest-auth.controller';
import { RoleController } from '@/presentation/controllers/role.controller';
import { GuestController } from '@/presentation/controllers/guest.controller';
import { CrmController } from '@/presentation/controllers/crm.controller';
import { ReservationController } from '@/presentation/controllers/reservation.controller';
import { GuestReservationController } from '@/presentation/controllers/guest-reservation.controller';
import { InventoryController } from '@/presentation/controllers/inventory.controller';
import { InventoryCategoriesController } from '@/presentation/controllers/inventory-categories.controller';
import { SuppliersController } from '@/presentation/controllers/suppliers.controller';
import { ShiftsController } from '@/presentation/controllers/shifts.controller';
import { ExperienceController } from '@/presentation/controllers/experience.controller';
import { MetricsController } from '@/presentation/controllers/metrics.controller';
import { GuestExperienceController } from '@/presentation/controllers/guest-experience.controller';
import { GuestTagController } from '@/presentation/controllers/guest-tag.controller';
import { StorageController } from '@/presentation/controllers/storage.controller';
import { UnitRatingController } from '@/presentation/controllers/unit-rating.controller';
import { GuestCartController } from '@/presentation/controllers/guest-cart.controller';
import { RefundController } from '@/presentation/controllers/refund.controller';
import { GuestExperiencePurchasesController } from '@/presentation/controllers/guest-experience-purchases.controller';
import { ExperiencePurchasesController } from '@/presentation/controllers/experience-purchases.controller';

@Module({
imports: [CqrsModule, ApplicationModule, CommunicationWebhookModule, PersistenceModule],
  controllers: [
    CommunicationWebhookController,
    AuthController,
    UserController,
    PropertyController,
    UnitController,
    AuditController,
    IncidentReportController,
    TenantController,
    GuestAuthController,
    GuestController,
    RoleController,
    CrmController,
    ReservationController,
    GuestReservationController,
    InventoryController,
    InventoryCategoriesController,
    SuppliersController,
    ShiftsController,
    ExperienceController,
    MetricsController,
    GuestExperienceController,
    GuestTagController,
    StorageController,
    UnitRatingController,
    GuestCartController,
    RefundController,
    GuestExperiencePurchasesController,
    ExperiencePurchasesController,
  ],
})
export class PresentationModule {}
