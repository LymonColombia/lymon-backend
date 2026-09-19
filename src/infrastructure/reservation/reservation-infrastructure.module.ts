import { Module } from '@nestjs/common';
import { ReservationCheckInScheduler } from './schedulers/reservation-checkin.scheduler';
import { ExpirePendingReservationsScheduler } from './schedulers/expire-pending-reservations.scheduler';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';

@Module({
  imports: [PersistenceModule],
  providers: [ReservationCheckInScheduler, ExpirePendingReservationsScheduler],
})
export class ReservationInfrastructureModule {}
