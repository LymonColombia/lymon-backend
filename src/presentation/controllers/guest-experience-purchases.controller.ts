import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { GetExperiencePurchasesByGuestQuery } from '@/application/experience-purchase/queries/get-experience-purchases-by-guest/get-experience-purchases-by-guest.query';
import { GetExperiencePurchaseByIdQuery } from '@/application/experience-purchase/queries/get-experience-purchase-by-id/get-experience-purchase-by-id.query';
import { CancelExperiencePurchaseCommand } from '@/application/experience-purchase/commands/cancel-experience-purchase/cancel-experience-purchase.command';

@ApiTags('guest-experience-purchases')
@ApiBearerAuth('GuestJWT-auth')
@Public()
@UseGuards(GuestJwtAuthGuard)
@Controller('guest/experience-purchases')
export class GuestExperiencePurchasesController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List experience purchases for the authenticated guest',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of experience purchases',
  })
  async findAll(
    @CurrentGuest() guest: GuestJwtPayload,
    @Query('tenantId') tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.queryBus.execute(
      new GetExperiencePurchasesByGuestQuery(
        guest.guestAccountId,
        tenantId,
        Math.max(1, Number.parseInt(page ?? '1', 10) || 1),
        Math.max(1, Number.parseInt(limit ?? '20', 10) || 20),
      ),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific experience purchase by ID' })
  @ApiResponse({ status: 200, description: 'Experience purchase detail' })
  async findOne(
    @CurrentGuest() guest: GuestJwtPayload,
    @Param('id') id: string,
  ) {
    return this.queryBus.execute(
      new GetExperiencePurchaseByIdQuery(id, guest.guestAccountId),
    );
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel own experience reservation' })
  @ApiResponse({
    status: 200,
    description: 'Experience reservation cancelled successfully',
  })
  async cancel(
    @CurrentGuest() guest: GuestJwtPayload,
    @Param('id') id: string,
  ) {
    await this.commandBus.execute(
      new CancelExperiencePurchaseCommand(id, {
        type: 'guest',
        guestAccountId: guest.guestAccountId,
      }),
    );

    return { message: 'Reservation cancelled successfully' };
  }
}
