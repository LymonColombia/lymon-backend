import { CreatePropertyCommand } from '@/application/property/commands/create-property.command';
import { CreatePropertyResult } from '@/application/property/commands/create-property.result';
import { UpdatePropertyCommand } from '@/application/property/commands/update-property.command';
import { UpdatePropertyResult } from '@/application/property/commands/update-property.result';
import { type JwtPayload } from '@/application/auth/services/jwt.service';
import { CurrentUser } from '@/infrastructure/auth/decorators/current-user.decorator';
import { RequirePermission } from '@/infrastructure/auth/decorators/require-permission.decorator';
import { Permission } from '@/domain/role/value-objects/permission.vo';
import { JwtAuthGuard } from '@/infrastructure/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/infrastructure/auth/guards/permission.guard';
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  ParseBoolPipe,
  DefaultValuePipe,
  ParseIntPipe,
  Get,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { CreatePropertyDto } from '@/presentation/dtos/property/create-property.dto';
import { UpdatePropertyDto } from '@/presentation/dtos/property/update-property.dto';
import { DeletePropertyCommand } from '@/application/property/commands/delete-property.command';
import { GetPropertiesByTenantQuery } from '@/application/property/queries/GetPropertiesByTenant/get-properties-by-tenant.query';
import { GetPropertiesByTenantResult } from '@/application/property/queries/GetPropertiesByTenant/get-properties-by-tenant.result';
import { GetPropertyByIdQuery } from '@/application/property/queries/GetPropertyById/get-property-by-id.query';
import { GetPropertyByIdResult } from '@/application/property/queries/GetPropertyById/get-property-by-id.result';

@ApiTags('properties')
@ApiBearerAuth('JWT-auth')
@Controller('properties')
export class PropertyController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new property' })
  @ApiQuery({
    name: 'autoCreateUnit',
    required: false,
    type: Boolean,
    description: 'Automatically create a unit if property type allows it',
  })
  @ApiResponse({ status: 201, description: 'Property created successfully' })
  @ApiResponse({ status: 403, description: 'Plan limit reached' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePropertyDto,
    @Query('autoCreateUnit', new DefaultValuePipe(false), ParseBoolPipe)
    autoCreateUnit: boolean,
  ) {
    const command = new CreatePropertyCommand(
      user.tenantId,
      dto.name,
      dto.description,
      dto.propertyType,
      dto.address,
      dto.city,
      dto.state,
      dto.country,
      dto.zipCode,
      dto.location,
      dto.checkInTime,
      dto.checkOutTime,
      dto.cancellationPolicy,
      dto.hostPhone,
      dto.hostEmail,
      autoCreateUnit,
      user.userId,
      user.email,
      dto.imageKey,
    );

    const result = await this.commandBus.execute<
      CreatePropertyCommand,
      CreatePropertyResult
    >(command);

    return {
      message: result.unitId
        ? 'Property and unit created successfully'
        : 'Property created successfully',
      data: {
        propertyId: result.propertyId,
        unitId: result.unitId,
      },
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all the properties for the current tenant' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Properties retrieved successfully',
  })
  async getProperties(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const query = new GetPropertiesByTenantQuery(user.tenantId, page, limit);

    const result = await this.queryBus.execute<
      GetPropertiesByTenantQuery,
      GetPropertiesByTenantResult
    >(query);

    return {
      message: 'Properties retrieved successfully',
      data: result.properties,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Get(':propertyId')
  @ApiOperation({ summary: 'Get a specific property by ID' })
  @ApiResponse({
    status: 200,
    description: 'Property retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Property not found',
  })
  async getProperty(
    @CurrentUser() user: JwtPayload,
    @Param('propertyId') propertyId: string,
  ) {
    const query = new GetPropertyByIdQuery(propertyId, user.tenantId);

    const result = await this.queryBus.execute<
      GetPropertyByIdQuery,
      GetPropertyByIdResult
    >(query);

    if (!result.property) {
      return {
        message: 'Property not found',
        data: null,
      };
    }

    return {
      message: 'Property retrieved successfully',
      data: result.property,
    };
  }

  @Patch(':propertyId')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.PROPERTY_EDIT)
  @ApiOperation({ summary: 'Update an existing property' })
  @ApiResponse({ status: 200, description: 'Property updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async updateProperty(
    @CurrentUser() user: JwtPayload,
    @Param('propertyId') propertyId: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    const command = new UpdatePropertyCommand(
      user.tenantId,
      propertyId,
      dto.name,
      dto.description,
      dto.address,
      dto.city,
      dto.state,
      dto.country,
      dto.zipCode,
      dto.location,
      dto.checkInTime,
      dto.checkOutTime,
      dto.cancellationPolicy,
      dto.hostPhone,
      dto.hostEmail,
      user.userId,
      user.email,
      dto.imageKey,
    );

    const result = await this.commandBus.execute<
      UpdatePropertyCommand,
      UpdatePropertyResult
    >(command);

    return {
      message: 'Property updated successfully',
      data: {
        propertyId: result.propertyId,
      },
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.PROPERTY_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a property' })
  @ApiResponse({ status: 204, description: 'Property deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'Property has active reservations and cannot be deleted',
  })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.commandBus.execute<DeletePropertyCommand, void>(
      new DeletePropertyCommand(id, user.tenantId, user.userId, user.email),
    );
  }
}
