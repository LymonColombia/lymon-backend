import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { ApproveRefundHandler } from '@/application/refund/commands/approve-refund/approve-refund.handler';
import { DenyRefundHandler } from '@/application/refund/commands/deny-refund/deny-refund.handler';
import { GetRefundRequestsHandler } from '@/application/refund/queries/get-refund-requests/get-refund-requests.handler';

const CommandHandlers = [ApproveRefundHandler, DenyRefundHandler];
const QueryHandlers = [GetRefundRequestsHandler];

@Module({
  imports: [CqrsModule, PersistenceModule],
  providers: [...CommandHandlers, ...QueryHandlers],
  exports: [...CommandHandlers, ...QueryHandlers],
})
export class RefundApplicationModule {}
