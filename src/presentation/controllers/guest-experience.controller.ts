import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/infrastructure/auth/decorators/public.decorator';
import { GuestPublic } from '@/infrastructure/guest-auth/decorators/guest-public.decorator';
import { GuestJwtAuthGuard } from '@/infrastructure/guest-auth/guards/guest-jwt-auth.guard';
import { GetAvailableExperiencesQuery } from '@/application/experience/queries/GetAvailableExperiences/get-available-experiences.query';
import { GetAvailableExperiencesResult } from '@/application/experience/queries/GetAvailableExperiences/get-available-experiences.result';
import { GetAvailableExperiencesQueryDto } from '@/presentation/dtos/experience/get-available-experiences-query.dto';
import { GetAvailableExperienceByIdQuery } from '@/application/experience/queries/GetAvailableExperienceById/get-available-experience-by-id.query';
import { GetAvailableExperienceByIdResult } from '@/application/experience/queries/GetAvailableExperienceById/get-available-experience-by-id.result';
import {
  PublicExperienceDto,
  PublicExperienceRecurrenceDto,
} from '@/application/experience/queries/shared/experience-read.dto';
import { GetExperienceReservedDatesQuery } from '@/application/experience-purchase/queries/get-experience-reserved-dates/get-experience-reserved-dates.query';

@ApiTags('guest-experiences')
@Public()
@UseGuards(GuestJwtAuthGuard)
@Controller('guest/experiences')
export class GuestExperienceController {
  constructor(private readonly queryBus: QueryBus) {}

  @GuestPublic()
  @Get()
  @ApiOperation({ summary: 'List available experiences for guests' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of active experiences',
  })
  async findAvailable(
    @Query() query: GetAvailableExperiencesQueryDto,
  ): Promise<PublicExperienceCatalogListResult> {
    const result = await this.queryBus.execute<
      GetAvailableExperiencesQuery,
      GetAvailableExperiencesResult
    >(
      new GetAvailableExperiencesQuery(
        query.page ?? 1,
        query.limit ?? 10,
        query.tenantId,
        query.propertyId,
        query.category,
        query.sortByPrice,
        query.scope,
        query.city,
      ),
    );

    return {
      experiences: result.experiences.map((experience) =>
        this.toCatalogExperienceDto(experience),
      ),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @GuestPublic()
  @Get(':experienceId/reserved-dates')
  @ApiOperation({ summary: 'Get already-reserved dates for an experience' })
  @ApiResponse({
    status: 200,
    description: 'List of already-reserved dates',
  })
  async reservedDates(@Param('experienceId') experienceId: string) {
    const result = await this.queryBus.execute<
      GetExperienceReservedDatesQuery,
      { reservedDates: Date[] }
    >(new GetExperienceReservedDatesQuery(experienceId));

    return { data: result };
  }

  @GuestPublic()
  @Get(':id')
  @ApiOperation({ summary: 'Get public available experience by ID' })
  @ApiResponse({
    status: 200,
    description: 'Available experience retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Experience not found' })
  async findById(@Param('id') id: string) {
    const result = await this.queryBus.execute<
      GetAvailableExperienceByIdQuery,
      GetAvailableExperienceByIdResult
    >(new GetAvailableExperienceByIdQuery(id));

    return {
      data: {
        ...this.toCatalogExperienceDto(result.experience),
        propertyName: result.propertyName,
        units: result.units,
      },
    };
  }

  private toCatalogExperienceDto(
    experience: PublicExperienceDto,
  ): PublicExperienceCatalogDto {
    return {
      id: experience.id,
      tenantId: experience.tenantId,
      propertyId: experience.propertyId ?? null,
      scope: String(experience.scope),
      name: experience.name,
      description: experience.description,
      city: String(experience.city),
      category: experience.category,
      priceCop: experience.priceCop,
      minimumParticipants: experience.minimumParticipants,
      capacity: experience.capacity,
      coverImageUrl: experience.mediaUrls[0] ?? null,
      mediaUrls: experience.mediaUrls,
      availabilityType: experience.availabilityType,
      recurrence: experience.recurrence
        ? new PublicExperienceRecurrenceDto(
            experience.recurrence.daysOfWeek,
            experience.recurrence.startTime,
            experience.recurrence.endTime,
          )
        : null,
      allowStandalonePurchase: experience.allowStandalonePurchase,
      allowReservationPurchase: experience.allowReservationPurchase,
      minNoticeHours: experience.minNoticeHours,
      purchaseCutoffHours: experience.purchaseCutoffHours,
    };
  }
}

interface PublicExperienceCatalogDto {
  id: string;
  tenantId: string;
  propertyId: string | null;
  scope: string;
  name: string;
  description: string;
  city: string;
  category: string;
  priceCop: number;
  minimumParticipants: number;
  capacity: number;
  coverImageUrl: string | null;
  mediaUrls: string[];
  availabilityType: string;
  recurrence: PublicExperienceRecurrenceDto | null;
  allowStandalonePurchase: boolean;
  allowReservationPurchase: boolean;
  minNoticeHours: number;
  purchaseCutoffHours: number;
}

interface PublicExperienceCatalogListResult {
  experiences: PublicExperienceCatalogDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
