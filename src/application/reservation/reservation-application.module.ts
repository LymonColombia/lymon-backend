import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { CreateReservationHandler } from './commands/create-reservation/create-reservation.handler';
import { ConfirmReservationHandler } from '@/application/reservation/commands/confirm-reservation/confirm-reservation.handler';
import { CancelReservationHandler } from '@/application/reservation/commands/cancel-reservation/cancel-reservation.handler';
import { CheckInHandler } from '@/application/reservation/commands/check-in/check-in.handler';
import { CheckOutHandler } from '@/application/reservation/commands/check-out/check-out.handler';
import { MarkNoShowHandler } from '@/application/reservation/commands/mark-no-show/mark-no-show.handler';
import { UpdateReservationHandler } from '@/application/reservation/commands/update-reservation/update-reservation.handler';
import { GetReservationByIdHandler } from '@/application/reservation/queries/get-reservation-by-id/get-reservation-by-id.query-handler';
import { GetReservationsByTenantHandler } from '@/application/reservation/queries/get-reservations-by-tenant/get-reservations-by-tenant.query-handler';
import { GetReservationsByUnitHandler } from '@/application/reservation/queries/get-reservations-by-unit/get-reservations-by-unit.query-handler';
import { GetGuestReservationHandler } from '@/application/reservation/queries/get-guest-reservation/get-guest-reservation.query-handler';
import { GetGuestReservationsHandler } from '@/application/reservation/queries/get-guest-reservations/get-guest-reservations.query-handler';
import { GetUnitOccupancyHandler } from '@/application/reservation/queries/get-unit-occupancy/get-unit-occupancy.query-handler';
import { CancelGuestReservationHandler } from '@/application/reservation/commands/cancel-guest-reservation/cancel-guest-reservation.handler';
import { SubmitCheckInInfoHandler } from '@/application/reservation/commands/submit-check-in-info/submit-check-in-info.handler';

const CommandHandlers = [
  CreateReservationHandler,
  ConfirmReservationHandler,
  CancelReservationHandler,
  CancelGuestReservationHandler,
  CheckInHandler,
  CheckOutHandler,
  MarkNoShowHandler,
  UpdateReservationHandler,
  SubmitCheckInInfoHandler,
];

const QueryHandlers = [
  GetReservationByIdHandler,
  GetReservationsByTenantHandler,
  GetReservationsByUnitHandler,
  GetGuestReservationHandler,
  GetGuestReservationsHandler,
  GetUnitOccupancyHandler,
];

@Module({
  imports: [CqrsModule, PersistenceModule],
  providers: [...CommandHandlers, ...QueryHandlers],
  exports: [...CommandHandlers, ...QueryHandlers],
})
export class ReservationApplicationModule {}
