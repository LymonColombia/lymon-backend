import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { EmailModule } from '@/infrastructure/email/email.module';
import { SendGuestMessageHandler } from './commands/send-guest-message/send-guest-message.handler';
import { RecordInboundMessageHandler } from './commands/record-inbound-message/record-inbound-message.handler';
import { UpdateMessageDeliveryStatusHandler } from './commands/update-message-delivery-status/update-message-delivery-status.handler';
import { GetGuestMessagesByGuestIdHandler } from './queries/get-guest-messages-by-guest-id/get-guest-messages-by-guest-id.handler';
import { GetGuestMessageByIdHandler } from './queries/get-guest-message-by-id/get-guest-message-by-id.handler';

const CommandHandlers = [
  SendGuestMessageHandler,
  RecordInboundMessageHandler,
  UpdateMessageDeliveryStatusHandler,
];
const QueryHandlers = [GetGuestMessagesByGuestIdHandler, GetGuestMessageByIdHandler];

@Module({
  imports: [CqrsModule, PersistenceModule, EmailModule],
  providers: [...CommandHandlers, ...QueryHandlers],
  exports: [...CommandHandlers, ...QueryHandlers],
})
export class GuestMessageApplicationModule {}
