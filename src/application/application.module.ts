import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { RegisterTenantHandler } from '@/application/tenant/commands/register-tenant.handler';
import { VerifyEmailHandler } from '@/application/user/commands/verify-email/verify-email.handler';
import { ChangePasswordHandler } from '@/application/user/commands/change-password/change-password.handler';
import { AuthModule } from '@/infrastructure/auth/auth.module';
import { LoginHandler } from '@/application/auth/commands/login.handler';
import { RefreshTokenHandler } from '@/application/auth/commands/refresh-token.handler';
import { LogoutHandler } from '@/application/auth/commands/logout.handler';
import { RecoverPasswordHandler } from '@/application/auth/commands/recover-password.handler';
import { ConfirmRecoverPasswordHandler } from './auth/commands/confirm-recover-password.handler';
import { EmailModule } from '@/infrastructure/email/email.module';
import { PropertyApplicationModule } from '@/application/property/property-application.module';
import { UnitApplicationModule } from '@/application/unit/unit-application.module';
import { InviteStaffHandler } from '@/application/user/commands/invite-staff/invite-staff.handler';
import { UpdateStaffHandler } from '@/application/user/commands/update-staff.handler';
import { AddRolesHandler } from '@/application/user/commands/add-roles.handler';
import { RemoveAllRolesHandler } from '@/application/user/commands/remove-all-roles.handler';
import { RemoveRoleHandler } from '@/application/user/commands/remove-role.handler';
import { AuditApplicationModule } from '@/application/audit/audit-application.module';
import { IncidentReportApplicationModule } from '@/application/incident-report/incident-report-application.module';
import { TenantApplicationModule } from '@/application/tenant/tenant-application.module';
import { GuestAuthApplicationModule } from '@/application/guest-auth/guest-auth-application.module';
import { RoleApplicationModule } from '@/application/role/role-application.module';
import { GuestApplicationModule } from '@/application/guest/guest-application.module';
import { ReservationApplicationModule } from '@/application/reservation/reservation-application.module';
import { InventoryApplicationModule } from '@/application/inventory/inventory-application.module';
import { GuestNoteApplicationModule } from '@/application/guest-note/guest-note-application.module';
import { GuestEmailApplicationModule } from '@/application/guest-email/guest-email-application.module';
import { GuestMessageApplicationModule } from '@/application/guest-message/guest-message-application.module';
import { ConversationApplicationModule } from '@/application/conversation/conversation-application.module';
import { UserApplicationModule } from '@/application/user/user-application.module';
import { GuestPreferenceApplicationModule } from '@/application/guest-preference/guest-preference-application.module';
import { ShiftApplicationModule } from '@/application/shift/shift-application.module';
import { DeleteShiftCommandHandler } from '@/application/shift/commands/delete-shift/delete-shift.handler';
import { GetShiftsHandler } from '@/application/shift/queries/get-shifts/get-shifts.handler';
import { ExperienceApplicationModule } from '@/application/experience/experience-application.module';
import { MetricsApplicationModule } from '@/application/metrics/metrics-application.module';
import { GuestTagApplicationModule } from '@/application/guest-tag/guest-tag-application.module';
import { StorageApplicationModule } from '@/application/storage/storage-application.module';
import { UnitRatingApplicationModule } from '@/application/unit-rating/unit-rating-application.module';
import { CartApplicationModule } from '@/application/cart/cart-application.module';
import { RefundApplicationModule } from '@/application/refund/refund-application.module';
import { ExperiencePurchaseApplicationModule } from '@/application/experience-purchase/experience-purchase-application.module';
import { ProcessWompiWebhookHandler } from '@/application/payment/commands/process-wompi-webhook/process-wompi-webhook.handler';
import { GetPaymentSessionStatusHandler } from '@/application/payment/queries/get-payment-session-status/get-payment-session-status.handler';
import { CompleteTutorialHandler } from '@/application/user/commands/complete-tutorial/complete-tutorial.handler';
import { RoleAssignmentValidator } from '@/application/user/services/role-assignment-validator.service';

const CommandHandlers = [
  RegisterTenantHandler,
  LoginHandler,
  RefreshTokenHandler,
  LogoutHandler,
  RecoverPasswordHandler,
  ConfirmRecoverPasswordHandler,
  VerifyEmailHandler,
  ChangePasswordHandler,
  InviteStaffHandler,
  UpdateStaffHandler,
  AddRolesHandler,
  RemoveAllRolesHandler,
  RemoveRoleHandler,
  CompleteTutorialHandler,
  DeleteShiftCommandHandler,
  ProcessWompiWebhookHandler,
  GetPaymentSessionStatusHandler,
];

const QueryHandlers = [GetShiftsHandler];
@Module({
  imports: [
    CqrsModule,
    PersistenceModule,
    AuthModule,
    EmailModule,
    PropertyApplicationModule,
    UnitApplicationModule,
    AuditApplicationModule,
    IncidentReportApplicationModule,
    TenantApplicationModule,
    GuestAuthApplicationModule,
    RoleApplicationModule,
    GuestApplicationModule,
    ReservationApplicationModule,
    InventoryApplicationModule,
    GuestNoteApplicationModule,
    GuestEmailApplicationModule,
    GuestMessageApplicationModule,
    ConversationApplicationModule,
    UserApplicationModule,
    GuestPreferenceApplicationModule,
    ShiftApplicationModule,
    ExperienceApplicationModule,
    MetricsApplicationModule,
    GuestTagApplicationModule,
    StorageApplicationModule,
    UnitRatingApplicationModule,
    CartApplicationModule,
    RefundApplicationModule,
    ExperiencePurchaseApplicationModule,
  ],
  providers: [...CommandHandlers, ...QueryHandlers, RoleAssignmentValidator],
  exports: [
    ...CommandHandlers,
    ...QueryHandlers,
    GuestApplicationModule,
    ShiftApplicationModule,
    MetricsApplicationModule,
  ],
})
export class ApplicationModule {}
