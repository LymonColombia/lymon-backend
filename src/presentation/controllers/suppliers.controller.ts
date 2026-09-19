import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Patch,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiQuery,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@/infrastructure/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/infrastructure/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/infrastructure/auth/guards/permission.guard';
import { RequirePermission } from '@/infrastructure/auth/decorators/require-permission.decorator';
import { Permission } from '@/domain/role/value-objects/permission.vo';
import { type JwtPayload } from '@/application/auth/services/jwt.service';
import { CreateSupplierDto } from '@/presentation/dtos/supplier/create-supplier.dto';
import { CreateSupplierCommand } from '@/application/inventory/commands/create-supplier/create-supplier.command';
import { CreateSupplierResult } from '@/application/inventory/commands/create-supplier/create-supplier.result';
import { UpdateSupplierDto } from '@/presentation/dtos/supplier/update-supplier.dto';
import { UpdateSupplierCommand } from '@/application/inventory/commands/update-supplier/update-supplier.command';
import { UpdateSupplierResult } from '@/application/inventory/commands/update-supplier/update-supplier.result';
import { DeleteSupplierCommand } from '@/application/inventory/commands/delete-supplier/delete-supplier.command';
import {
  GetSuppliersQuery,
  type SupplierSortBy,
  type SupplierSortOrder,
} from '@/application/inventory/queries/get-suppliers/get-suppliers.query';
import { GetSuppliersResult } from '@/application/inventory/queries/get-suppliers/get-suppliers.result';
import { GetItemsBySupplierQuery } from '@/application/inventory/queries/get-items-by-supplier/get-items-by-supplier.query';
import { GetItemsBySupplierResult } from '@/application/inventory/queries/get-items-by-supplier/get-items-by-supplier.result';

@ApiTags('suppliers')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.PROPERTY_VIEW)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get suppliers list' })
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
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search suppliers by name',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['name', 'createdAt'],
    description: 'Sort field (default: createdAt)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order (default: desc)',
  })
  @ApiResponse({ status: 200, description: 'Suppliers retrieved successfully' })
  async getSuppliers(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: SupplierSortBy,
    @Query('sortOrder') sortOrder?: SupplierSortOrder,
  ) {
    const result = await this.queryBus.execute<
      GetSuppliersQuery,
      GetSuppliersResult
    >(
      new GetSuppliersQuery(
        user.tenantId,
        page,
        limit,
        search,
        sortBy ?? 'createdAt',
        sortOrder ?? 'desc',
      ),
    );

    return {
      message: 'Suppliers retrieved successfully',
      data: result.suppliers,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.PROPERTY_EDIT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a supplier' })
  @ApiResponse({ status: 201, description: 'Supplier created successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Duplicate supplier NIT' })
  async createSupplier(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSupplierDto,
  ) {
    const createSupplierDto = dto;

    const result = await this.commandBus.execute<
      CreateSupplierCommand,
      CreateSupplierResult
    >(
      new CreateSupplierCommand(
        user.tenantId,
        createSupplierDto.name,
        createSupplierDto.contactEmail,
        createSupplierDto.contactPhone,
        createSupplierDto.country,
        createSupplierDto.city,
        createSupplierDto.nit,
        user.userId,
        user.email,
      ),
    );

    return {
      message: 'Supplier created successfully',
      data: {
        supplierId: result.supplierId,
      },
    };
  }

  @Patch(':supplierId')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.PROPERTY_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a supplier' })
  @ApiResponse({ status: 200, description: 'Supplier updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  @ApiResponse({ status: 409, description: 'Duplicate supplier NIT' })
  async updateSupplier(
    @CurrentUser() user: JwtPayload,
    @Param('supplierId') supplierId: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    const result = await this.commandBus.execute<
      UpdateSupplierCommand,
      UpdateSupplierResult
    >(
      new UpdateSupplierCommand(
        user.tenantId,
        supplierId,
        dto.name,
        dto.contactEmail,
        dto.contactPhone,
        dto.country,
        dto.city,
        dto.nit,
        user.userId,
        user.email,
      ),
    );

    return {
      message: 'Supplier updated successfully',
      data: {
        supplierId: result.supplierId,
      },
    };
  }

  @Delete(':supplierId')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.PROPERTY_EDIT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a supplier' })
  @ApiResponse({ status: 204, description: 'Supplier deleted successfully' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  @ApiResponse({
    status: 409,
    description: 'Supplier has associated inventory items',
  })
  async deleteSupplier(
    @CurrentUser() user: JwtPayload,
    @Param('supplierId') supplierId: string,
  ) {
    await this.commandBus.execute<DeleteSupplierCommand, void>(
      new DeleteSupplierCommand(
        String(user.tenantId),
        supplierId,
        String(user.userId),
        String(user.email),
      ),
    );
  }

  @Get(':supplierId/items')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.PROPERTY_VIEW)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get inventory items by supplier' })
  @ApiResponse({
    status: 200,
    description: 'Supplier items retrieved successfully',
  })
  async getSupplierItems(
    @CurrentUser() user: JwtPayload,
    @Param('supplierId') supplierId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    const result: GetItemsBySupplierResult = await this.queryBus.execute<
      GetItemsBySupplierQuery,
      GetItemsBySupplierResult
    >(
      new GetItemsBySupplierQuery(
        user.tenantId,
        supplierId,
        page ?? 1,
        limit ?? 20,
      ),
    );

    return {
      message: 'Supplier items retrieved successfully',
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }
}
