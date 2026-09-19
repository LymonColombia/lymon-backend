import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { JwtAuthGuard } from '@/infrastructure/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/infrastructure/auth/guards/permission.guard';
import { RequirePermission } from '@/infrastructure/auth/decorators/require-permission.decorator';
import { Permission } from '@/domain/role/value-objects/permission.vo';
import { CurrentUser } from '@/infrastructure/auth/decorators/current-user.decorator';
import { type JwtPayload } from '@/application/auth/services/jwt.service';
import { CreateIncidentReportDto } from '@/presentation/dtos/incident-report/create-incident-report.dto';
import { UpdateIncidentReportDto } from '@/presentation/dtos/incident-report/update-incident-report.dto';
import { CreateIncidentReportCommand } from '@/application/incident-report/commands/create-incident-report.command';
import { CreateIncidentReportResult } from '@/application/incident-report/commands/create-incident-report.result';
import { UpdateIncidentReportCommand } from '@/application/incident-report/commands/update-incident-report.command';
import { UpdateIncidentReportResult } from '@/application/incident-report/commands/update-incident-report.result';
import { DeleteIncidentReportCommand } from '@/application/incident-report/commands/delete-incident-report.command';
import { GetIncidentReportByIdQuery } from '@/application/incident-report/queries/GetIncidentReportById/get-incident-report-by-id.query';
import { GetIncidentReportByIdResult } from '@/application/incident-report/queries/GetIncidentReportById/get-incident-report-by-id.result';
import { GetIncidentReportsByPropertyQuery } from '@/application/incident-report/queries/GetIncidentReportsByProperty/get-incident-reports-by-property.query';
import { GetIncidentReportsByPropertyResult } from '@/application/incident-report/queries/GetIncidentReportsByProperty/get-incident-reports-by-property.result';
import { GetIncidentReportsByCreatorQuery } from '@/application/incident-report/queries/GetIncidentReportsByCreator/get-incident-reports-by-creator.query';
import { GetIncidentReportsByCreatorResult } from '@/application/incident-report/queries/GetIncidentReportsByCreator/get-incident-reports-by-creator.result';

@ApiTags('incident-reports')
@ApiBearerAuth('JWT-auth')
@Controller('incident-reports')
export class IncidentReportController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.INCIDENT_REPORT_CREATE)
  @ApiOperation({ summary: 'Create a new incident report' })
  @ApiResponse({
    status: 201,
    description: 'Incident report created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateIncidentReportDto,
  ) {
    const result = await this.commandBus.execute<
      CreateIncidentReportCommand,
      CreateIncidentReportResult
    >(
      new CreateIncidentReportCommand(
        user.tenantId,
        dto.propertyId,
        dto.title,
        dto.description,
        dto.attachmentUrls ?? [],
        user.userId,
        user.email,
      ),
    );

    return {
      message: 'Incident report created successfully',
      data: { reportId: result.reportId },
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.INCIDENT_REPORT_READ)
  @ApiOperation({ summary: 'Get incident report by ID' })
  @ApiResponse({ status: 200, description: 'Incident report detail' })
  @ApiResponse({ status: 404, description: 'Incident report not found' })
  async findById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const result = await this.queryBus.execute<
      GetIncidentReportByIdQuery,
      GetIncidentReportByIdResult
    >(new GetIncidentReportByIdQuery(id, user.tenantId));

    return { data: result.report };
  }

  @Get('by-property/:propertyId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.INCIDENT_REPORT_READ)
  @ApiOperation({ summary: 'List incident reports by property' })
  @ApiResponse({ status: 200, description: 'List of incident reports' })
  async findByProperty(
    @CurrentUser() user: JwtPayload,
    @Param('propertyId') propertyId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const result = await this.queryBus.execute<
      GetIncidentReportsByPropertyQuery,
      GetIncidentReportsByPropertyResult
    >(
      new GetIncidentReportsByPropertyQuery(
        user.tenantId,
        propertyId,
        Number(page),
        Number(limit),
      ),
    );

    return {
      data: result.reports,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get('by-creator/:createdBy')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.INCIDENT_REPORT_READ)
  @ApiOperation({ summary: 'List incident reports by creator' })
  @ApiResponse({ status: 200, description: 'List of incident reports' })
  async findByCreator(
    @CurrentUser() user: JwtPayload,
    @Param('createdBy') createdBy: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const result = await this.queryBus.execute<
      GetIncidentReportsByCreatorQuery,
      GetIncidentReportsByCreatorResult
    >(
      new GetIncidentReportsByCreatorQuery(
        user.tenantId,
        createdBy,
        Number(page),
        Number(limit),
      ),
    );

    return {
      data: result.reports,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.INCIDENT_REPORT_EDIT)
  @ApiOperation({ summary: 'Update an incident report' })
  @ApiResponse({
    status: 200,
    description: 'Incident report updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'STAFF can only edit their own reports',
  })
  @ApiResponse({ status: 404, description: 'Incident report not found' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateIncidentReportDto,
  ) {
    const canManageAll =
      user.isOwner ||
      user.roleAssignments.some((ra) =>
        ra.permissions.includes(Permission.PROPERTY_CREATE),
      );

    const result = await this.commandBus.execute<
      UpdateIncidentReportCommand,
      UpdateIncidentReportResult
    >(
      new UpdateIncidentReportCommand(
        id,
        user.tenantId,
        dto.title,
        dto.description,
        dto.attachmentUrls,
        user.userId,
        user.email,
        canManageAll,
      ),
    );

    return {
      message: 'Incident report updated successfully',
      data: { reportId: result.reportId },
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.INCIDENT_REPORT_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an incident report' })
  @ApiResponse({ status: 204, description: 'Incident report deleted' })
  @ApiResponse({
    status: 403,
    description: 'STAFF can only delete their own reports',
  })
  @ApiResponse({ status: 404, description: 'Incident report not found' })
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const canManageAll =
      user.isOwner ||
      user.roleAssignments.some((ra) =>
        ra.permissions.includes(Permission.PROPERTY_CREATE),
      );

    await this.commandBus.execute<DeleteIncidentReportCommand, void>(
      new DeleteIncidentReportCommand(
        id,
        user.tenantId,
        user.userId,
        user.email,
        canManageAll,
      ),
    );
  }
}
