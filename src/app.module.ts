import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PresentationModule } from '@/presentation/presentation.module';
import { ApplicationModule } from '@/application/application.module';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthModule } from '@/infrastructure/auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '@/infrastructure/auth/guards/jwt-auth.guard';
import { TrialExpiredGuard } from '@/infrastructure/auth/guards/trial-expired.guard';
import { AuditInfrastructureModule } from '@/infrastructure/audit/audit-infrastructure.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ReservationInfrastructureModule } from '@/infrastructure/reservation/reservation-infrastructure.module';
import { InventoryInfrastructureModule } from '@/infrastructure/inventory/inventory-infrastructure.module';
import { GuestPreferenceInfrastructureModule } from '@/infrastructure/guest-preference/guest-preference-infrastructure.module';
import { PaymentModule } from '@/infrastructure/payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    AuthModule,
    PresentationModule,
    ApplicationModule,
    AuditInfrastructureModule,
    ReservationInfrastructureModule,
    InventoryInfrastructureModule,
    GuestPreferenceInfrastructureModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TrialExpiredGuard,
    },
  ],
})
export class AppModule {}
