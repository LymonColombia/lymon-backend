import {
  Body,
  Controller,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@/infrastructure/auth/decorators/public.decorator';
import { GuestJwtAuthGuard } from '@/infrastructure/guest-auth/guards/guest-jwt-auth.guard';
import { CurrentGuest } from '@/infrastructure/guest-auth/decorators/current-guest.decorator';
import { type GuestJwtPayload } from '@/application/guest-auth/services/guest-jwt.service';
import { CreateUnitRatingDto } from '@/presentation/dtos/unit-rating/create-unit-rating.dto';
import { CreateUnitRatingCommand } from '@/application/unit-rating/commands/create-unit-rating/create-unit-rating.command';
import { CreateUnitRatingResult } from '@/application/unit-rating/commands/create-unit-rating/create-unit-rating.result';
import { GetUnitRatingsQuery } from '@/application/unit-rating/queries/get-unit-ratings/get-unit-ratings.query';
import { GetUnitRatingsResult } from '@/application/unit-rating/queries/get-unit-ratings/get-unit-ratings.result';

@ApiTags('unit-ratings')
@Controller()
export class UnitRatingController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('guest/unit-ratings')
  @ApiBearerAuth('GuestJWT-auth')
  @Public()
  @UseGuards(GuestJwtAuthGuard)
  @ApiOperation({ summary: 'Submit a rating for a unit after checkout' })
  @ApiResponse({ status: 201, description: 'Rating submitted successfully' })
  async create(
    @CurrentGuest() guest: GuestJwtPayload,
    @Body() dto: CreateUnitRatingDto,
  ): Promise<{ message: string; unitRatingId: string }> {
    const result = await this.commandBus.execute<
      CreateUnitRatingCommand,
      CreateUnitRatingResult
    >(
      new CreateUnitRatingCommand(
        guest.guestAccountId,
        guest.email,
        dto.reservationId,
        dto.rate,
        dto.message ?? null,
      ),
    );

    return {
      message: 'Rating submitted successfully',
      unitRatingId: result.unitRatingId,
    };
  }

  @Get('units/:unitId/ratings')
  @Public()
  @ApiOperation({ summary: 'Get paginated ratings for a unit' })
  @ApiResponse({ status: 200, description: 'Paginated unit ratings' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['best', 'worst'],
    description:
      'Sort by rate: best (highest first) or worst (lowest first). Default: newest first.',
  })
  @ApiQuery({
    name: 'filterRate',
    required: false,
    example: '3',
    description: 'Filter ratings by exact rate value (1–5)',
  })
  async findByUnit(
    @Param('unitId') unitId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: 'best' | 'worst',
    @Query('filterRate') filterRate?: string,
  ): Promise<GetUnitRatingsResult> {
    const parsedFilterRate = filterRate
      ? Number.parseInt(filterRate, 10)
      : undefined;

    return this.queryBus.execute<GetUnitRatingsQuery, GetUnitRatingsResult>(
      new GetUnitRatingsQuery(
        '',
        unitId,
        Math.max(1, Number.parseInt(page ?? '1', 10) || 1),
        Math.max(1, Number.parseInt(limit ?? '20', 10) || 20),
        sort,
        parsedFilterRate,
      ),
    );
  }
}
