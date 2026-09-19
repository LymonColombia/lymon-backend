import { Module } from '@nestjs/common';

import { TENANT_REPOSITORY } from '@/domain/tenant/repositories/tenant.repository';
import { USER_REPOSITORY } from '@/domain/user/repositories/user.repository';
import { PROPERTY_REPOSITORY } from '@/domain/property/repositories/property.repository';
import { UNIT_REPOSITORY } from '@/domain/unit/repositories/unit.repository';
import { GUEST_REPOSITORY } from '@/domain/guest/repositories/guest.repository';
import { GUEST_ACCOUNT_REPOSITORY } from '@/domain/guest-account/repositories/guest-account.repository';
import { ROLE_REPOSITORY } from '@/domain/role/repositories/role.repository';
import { AUDIT_LOG_REPOSITORY } from '@/domain/audit/repositories/audit-log.repository';
import { TRANSACTION_MANAGER } from '@/domain/shared/transaction-manager.interface';
import { INCIDENT_REPORT_REPOSITORY } from '@/domain/incident-report/repositories/incident-report.repository';
import { RESERVATION_REPOSITORY } from '@/domain/reservation/repositories/reservation.repository';
import { GUEST_RESERVATIONS_READ_REPOSITORY } from '@/domain/reservation/repositories/guest-reservations-read.repository';
import { CART_REPOSITORY } from '@/domain/cart/repositories/cart.repository';
import { EXPERIENCE_PURCHASE_REPOSITORY } from '@/domain/experience-purchase/repositories/experience-purchase.repository';
import { INVENTORY_ITEM_REPOSITORY } from '@/domain/inventory/repositories/inventory-item.repository';
import { INVENTORY_MOVEMENT_REPOSITORY } from '@/domain/inventory/repositories/inventory-movement.repository';
import { SUPPLIER_REPOSITORY } from '@/domain/inventory/repositories/supplier.repository';
import { INVENTORY_ITEM_CATEGORY_REPOSITORY } from '@/domain/inventory/repositories/inventory-item-category.repository';
import { GUEST_NOTE_REPOSITORY } from '@/domain/guest-note/repositories/guest-note.repository';
import { GUEST_EMAIL_REPOSITORY } from '@/domain/guest-email/repositories/guest-email.repository';
import { SHIFT_REPOSITORY } from '@/domain/shift/repositories/shift.repository';
import { GUEST_PREFERENCE_CATALOG_REPOSITORY } from '@/domain/guest-preference/repositories/guest-preference-catalog.repository';
import { EXPERIENCE_REPOSITORY } from '@/domain/experience/repositories/experience.repository';
import { METRICS_READ_REPOSITORY } from '@/domain/metrics/repositories/metrics-read.repository';
import { GUEST_TAG_REPOSITORY } from '@/domain/guest-tag/repositories/guest-tag.repository';
import { UNIT_RATING_REPOSITORY } from '@/domain/unit-rating/repositories/unit-rating.repository';
import { REFUND_REQUEST_REPOSITORY } from '@/domain/refund/repositories/refund-request.repository';
import { PAYMENT_SESSION_REPOSITORY } from '@/domain/payment/repositories/payment-session.repository';
import { GUEST_MESSAGE_REPOSITORY } from '@/domain/guest-message/repositories/guest-message.repository';
import { CONVERSATION_REPOSITORY } from '@/domain/conversation/repositories/conversation.repository';

import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { PrismaTransactionManager } from '@/infrastructure/persistence/transaction/prisma-transaction-manager';

import { PrismaTenantRepository } from './repositories/prisma-tenant.repository';
import { PrismaUserRepository } from './repositories/prisma-user.repository';
import { PrismaPropertyRepository } from './repositories/prisma-property.repository';
import { PrismaUnitRepository } from './repositories/prisma-unit.repository';
import { PrismaGuestRepository } from './repositories/prisma-guest.repository';
import { PrismaGuestAccountRepository } from './repositories/prisma-guest-account.repository';
import { PrismaRoleRepository } from './repositories/prisma-role.repository';
import { PrismaAuditLogRepository } from './repositories/prisma-audit-log.repository';
import { PrismaIncidentReportRepository } from './repositories/prisma-incident-report.repository';
import { PrismaReservationRepository } from './repositories/prisma-reservation.repository';
import { PrismaCartRepository } from './repositories/prisma-cart.repository';
import { PrismaExperiencePurchaseRepository } from './repositories/prisma-experience-purchase.repository';
import { PrismaInventoryItemRepository } from './repositories/prisma-inventory-item.repository';
import { PrismaInventoryMovementRepository } from './repositories/prisma-inventory-movement.repository';
import { PrismaSupplierRepository } from './repositories/prisma-supplier.repository';
import { PrismaInventoryItemCategoryRepository } from './repositories/prisma-inventory-item-category.repository';
import { PrismaGuestNoteRepository } from './repositories/prisma-guest-note.repository';
import { PrismaGuestEmailRepository } from './repositories/prisma-guest-email.repository';
import { PrismaShiftRepository } from './repositories/prisma-shift.repository';
import { PrismaGuestPreferenceCatalogRepository } from './repositories/prisma-guest-preference-catalog.repository';
import { PrismaExperienceRepository } from './repositories/prisma-experience.repository';
import { PrismaMetricsReadRepository } from './repositories/prisma-metrics-read.repository';
import { PrismaGuestTagRepository } from './repositories/prisma-guest-tag.repository';
import { PrismaUnitRatingRepository } from './repositories/prisma-unit-rating.repository';
import { PrismaRefundRequestRepository } from './repositories/prisma-refund-request.repository';
import { PrismaPaymentSessionRepository } from './repositories/prisma-payment-session.repository';
import { PrismaGuestMessageRepository } from './repositories/prisma-guest-message.repository';
import { PrismaConversationRepository } from './repositories/prisma-conversation.repository';

import { RoleSeedService } from './seeds/role-seed.service';
import { GuestTagSeedService } from './seeds/guest-tag-seed.service';
import { TenantSeedService } from './seeds/tenant-seed.service';
import { GuestAccountSeedService } from './seeds/guest-account-seed.service';

@Module({
  providers: [
    PrismaService,
    { provide: TRANSACTION_MANAGER, useClass: PrismaTransactionManager },

    { provide: TENANT_REPOSITORY, useClass: PrismaTenantRepository },
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: PROPERTY_REPOSITORY, useClass: PrismaPropertyRepository },
    { provide: UNIT_REPOSITORY, useClass: PrismaUnitRepository },
    { provide: GUEST_REPOSITORY, useClass: PrismaGuestRepository },
    { provide: GUEST_ACCOUNT_REPOSITORY, useClass: PrismaGuestAccountRepository },
    { provide: ROLE_REPOSITORY, useClass: PrismaRoleRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: PrismaAuditLogRepository },
    { provide: INCIDENT_REPORT_REPOSITORY, useClass: PrismaIncidentReportRepository },
    { provide: RESERVATION_REPOSITORY, useClass: PrismaReservationRepository },
    // one class, two ports
    { provide: GUEST_RESERVATIONS_READ_REPOSITORY, useExisting: RESERVATION_REPOSITORY },
    { provide: CART_REPOSITORY, useClass: PrismaCartRepository },
    { provide: EXPERIENCE_PURCHASE_REPOSITORY, useClass: PrismaExperiencePurchaseRepository },
    { provide: INVENTORY_ITEM_REPOSITORY, useClass: PrismaInventoryItemRepository },
    { provide: INVENTORY_MOVEMENT_REPOSITORY, useClass: PrismaInventoryMovementRepository },
    { provide: SUPPLIER_REPOSITORY, useClass: PrismaSupplierRepository },
    { provide: INVENTORY_ITEM_CATEGORY_REPOSITORY, useClass: PrismaInventoryItemCategoryRepository },
    { provide: GUEST_NOTE_REPOSITORY, useClass: PrismaGuestNoteRepository },
    { provide: GUEST_EMAIL_REPOSITORY, useClass: PrismaGuestEmailRepository },
    { provide: SHIFT_REPOSITORY, useClass: PrismaShiftRepository },
    { provide: GUEST_PREFERENCE_CATALOG_REPOSITORY, useClass: PrismaGuestPreferenceCatalogRepository },
    { provide: EXPERIENCE_REPOSITORY, useClass: PrismaExperienceRepository },
    { provide: METRICS_READ_REPOSITORY, useClass: PrismaMetricsReadRepository },
    { provide: GUEST_TAG_REPOSITORY, useClass: PrismaGuestTagRepository },
    { provide: UNIT_RATING_REPOSITORY, useClass: PrismaUnitRatingRepository },
    { provide: REFUND_REQUEST_REPOSITORY, useClass: PrismaRefundRequestRepository },
    { provide: PAYMENT_SESSION_REPOSITORY, useClass: PrismaPaymentSessionRepository },
    { provide: GUEST_MESSAGE_REPOSITORY, useClass: PrismaGuestMessageRepository },
    { provide: CONVERSATION_REPOSITORY, useClass: PrismaConversationRepository },

    RoleSeedService,
    GuestTagSeedService,
    TenantSeedService,
    GuestAccountSeedService,
  ],
  exports: [
    PrismaService,
    TRANSACTION_MANAGER,
    TENANT_REPOSITORY,
    USER_REPOSITORY,
    PROPERTY_REPOSITORY,
    UNIT_REPOSITORY,
    GUEST_REPOSITORY,
    GUEST_ACCOUNT_REPOSITORY,
    ROLE_REPOSITORY,
    AUDIT_LOG_REPOSITORY,
    INCIDENT_REPORT_REPOSITORY,
    RESERVATION_REPOSITORY,
    GUEST_RESERVATIONS_READ_REPOSITORY,
    CART_REPOSITORY,
    EXPERIENCE_PURCHASE_REPOSITORY,
    INVENTORY_ITEM_REPOSITORY,
    INVENTORY_MOVEMENT_REPOSITORY,
    SUPPLIER_REPOSITORY,
    INVENTORY_ITEM_CATEGORY_REPOSITORY,
    GUEST_NOTE_REPOSITORY,
    GUEST_EMAIL_REPOSITORY,
    SHIFT_REPOSITORY,
    GUEST_PREFERENCE_CATALOG_REPOSITORY,
    EXPERIENCE_REPOSITORY,
    METRICS_READ_REPOSITORY,
    GUEST_TAG_REPOSITORY,
    UNIT_RATING_REPOSITORY,
    REFUND_REQUEST_REPOSITORY,
    PAYMENT_SESSION_REPOSITORY,
    GUEST_MESSAGE_REPOSITORY,
    CONVERSATION_REPOSITORY,
  ],
})
export class PersistenceModule {}
