import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@/infrastructure/auth/decorators/public.decorator';
import { GuestJwtAuthGuard } from '@/infrastructure/guest-auth/guards/guest-jwt-auth.guard';
import { CurrentGuest } from '@/infrastructure/guest-auth/decorators/current-guest.decorator';
import { type GuestJwtPayload } from '@/application/guest-auth/services/guest-jwt.service';
import { AddExperienceToCartDto } from '@/presentation/dtos/add-experience-to-cart.dto';
import { SetCartReservationDto } from '@/presentation/dtos/set-cart-reservation.dto';
import { CheckoutCartDto } from '@/presentation/dtos/checkout-cart.dto';
import { AddExperienceToCartCommand } from '@/application/cart/commands/add-experience-to-cart/add-experience-to-cart.command';
import { RemoveExperienceFromCartCommand } from '@/application/cart/commands/remove-experience-from-cart/remove-experience-from-cart.command';
import { SetCartReservationCommand } from '@/application/cart/commands/set-cart-reservation/set-cart-reservation.command';
import { RemoveCartReservationCommand } from '@/application/cart/commands/remove-cart-reservation/remove-cart-reservation.command';
import { ClearCartCommand } from '@/application/cart/commands/clear-cart/clear-cart.command';
import { CheckoutCartCommand } from '@/application/cart/commands/checkout-cart/checkout-cart.command';
import { GetGuestCartQuery } from '@/application/cart/queries/get-guest-cart/get-guest-cart.query';
import type { GuestCartResult } from '@/application/cart/queries/get-guest-cart/get-guest-cart.handler';
import type { PaymentCheckoutResponse } from '@/domain/shared/payment-gateway.interface';
import type { GetPaymentSessionStatusResult } from '@/application/payment/queries/get-payment-session-status/get-payment-session-status.handler';
import { GetPaymentSessionStatusQuery } from '@/application/payment/queries/get-payment-session-status/get-payment-session-status.query';

@ApiTags('guest-cart')
@ApiBearerAuth('GuestJWT-auth')
@Public()
@UseGuards(GuestJwtAuthGuard)
@Controller('guest/cart')
export class GuestCartController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get the guest open cart' })
  @ApiResponse({ status: 200, description: 'Current open cart or null' })
  async getCart(
    @CurrentGuest() guest: GuestJwtPayload,
  ): Promise<GuestCartResult | null> {
    return this.queryBus.execute(new GetGuestCartQuery(guest.guestAccountId));
  }

  @Post('items')
  @ApiOperation({ summary: 'Add an experience to cart' })
  @ApiResponse({ status: 201, description: 'Experience added to cart' })
  async addExperience(
    @CurrentGuest() guest: GuestJwtPayload,
    @Body() dto: AddExperienceToCartDto,
  ) {
    await this.commandBus.execute(
      new AddExperienceToCartCommand(
        guest.guestAccountId,
        dto.tenantId,
        dto.experienceId,
        dto.quantity,
        dto.selectedDate ? new Date(dto.selectedDate) : null,
        dto.reservationId ?? null,
        guest.email,
      ),
    );
    return { message: 'Experience added to cart' };
  }

  @Delete('items/:experienceId')
  @ApiOperation({ summary: 'Remove an experience from cart' })
  async removeExperience(
    @CurrentGuest() guest: GuestJwtPayload,
    @Param('experienceId') experienceId: string,
    @Query('selectedDate') selectedDate?: string,
  ) {
    await this.commandBus.execute(
      new RemoveExperienceFromCartCommand(
        guest.guestAccountId,
        experienceId,
        selectedDate ? new Date(selectedDate) : null,
      ),
    );
    return { message: 'Experience removed from cart' };
  }

  @Post('reservation')
  @ApiOperation({ summary: 'Set a reservation draft in the cart for payment' })
  @ApiResponse({ status: 201, description: 'Reservation draft added to cart' })
  async setReservation(
    @CurrentGuest() guest: GuestJwtPayload,
    @Body() dto: SetCartReservationDto,
  ) {
    await this.commandBus.execute(
      new SetCartReservationCommand(
        guest.guestAccountId,
        dto.tenantId,
        dto.propertyId,
        dto.unitId,
        new Date(dto.checkIn),
        new Date(dto.checkOut),
        dto.guestsCount,
        dto.pricePerNight,
        dto.notes ?? null,
        guest.email,
      ),
    );
    return { message: 'Reservation draft added to cart' };
  }

  @Delete('reservation')
  @ApiOperation({ summary: 'Remove the reservation from cart' })
  async removeReservation(@CurrentGuest() guest: GuestJwtPayload) {
    await this.commandBus.execute(
      new RemoveCartReservationCommand(guest.guestAccountId),
    );
    return { message: 'Reservation removed from cart' };
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all items from cart' })
  async clearCart(@CurrentGuest() guest: GuestJwtPayload) {
    await this.commandBus.execute(new ClearCartCommand(guest.guestAccountId));
    return { message: 'Cart cleared' };
  }

  @Post('checkout')
  @ApiOperation({
    summary: 'Checkout cart and create the Wompi payment payload',
  })
  @ApiResponse({
    status: 201,
    description: 'Wompi checkout payload generated successfully',
  })
  async checkout(
    @CurrentGuest() guest: GuestJwtPayload,
    @Body() dto: CheckoutCartDto,
  ): Promise<PaymentCheckoutResponse> {
    return this.commandBus.execute(
      new CheckoutCartCommand(
        guest.guestAccountId,
        guest.guestAccountId,
        guest.email,
        dto.reservationItem
          ? {
              tenantId: dto.reservationItem.tenantId,
              propertyId: dto.reservationItem.propertyId,
              unitId: dto.reservationItem.unitId,
              checkIn: new Date(dto.reservationItem.checkIn),
              checkOut: new Date(dto.reservationItem.checkOut),
              guestsCount: dto.reservationItem.guestsCount,
              pricePerNight: dto.reservationItem.pricePerNight,
              notes: dto.reservationItem.notes ?? null,
            }
          : undefined,
        dto.experienceItems?.map((item) => ({
          tenantId: item.tenantId,
          experienceId: item.experienceId,
          quantity: item.quantity,
          selectedDate: item.selectedDate ? new Date(item.selectedDate) : null,
        })),
      ),
    );
  }

  @Get('checkout/status/:reference')
  @ApiOperation({ summary: 'Get the status of a Wompi checkout session' })
  @ApiResponse({ status: 200, description: 'Checkout session status' })
  async getCheckoutStatus(
    @CurrentGuest() guest: GuestJwtPayload,
    @Param('reference') reference: string,
  ): Promise<GetPaymentSessionStatusResult> {
    return this.queryBus.execute(
      new GetPaymentSessionStatusQuery(guest.guestAccountId, reference),
    );
  }
}
