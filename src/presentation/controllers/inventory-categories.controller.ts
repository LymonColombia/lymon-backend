import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '@/infrastructure/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/infrastructure/auth/guards/permission.guard';
import { RequirePermission } from '@/infrastructure/auth/decorators/require-permission.decorator';
import { Permission } from '@/domain/role/value-objects/permission.vo';
import { CurrentUser } from '@/infrastructure/auth/decorators/current-user.decorator';
import { type JwtPayload } from '@/application/auth/services/jwt.service';
import { CreateInventoryItemCategoryDto } from '@/presentation/dtos/inventory/create-inventory-item-category.dto';
import { CreateInventoryItemCategoryCommand } from '@/application/inventory/commands/create-inventory-item-category/create-inventory-item-category.command';
import { CreateInventoryItemCategoryResult } from '@/application/inventory/commands/create-inventory-item-category/create-inventory-item-category.result';
import { GetInventoryItemCategoriesQuery } from '@/application/inventory/queries/get-inventory-item-categories/get-inventory-item-categories.query';
import { GetInventoryItemCategoriesResult } from '@/application/inventory/queries/get-inventory-item-categories/get-inventory-item-categories.result';

class GetCategoriesQueryParams {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;
}

@ApiTags('inventory-categories')
@ApiBearerAuth('JWT-auth')
@Controller('inventory/categories')
export class InventoryCategoriesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.PROPERTY_EDIT)
  @ApiOperation({ summary: 'List inventory item categories' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  async listCategories(
    @CurrentUser() user: JwtPayload,
    @Query() params: GetCategoriesQueryParams,
  ) {
    const result = await this.queryBus.execute<
      GetInventoryItemCategoriesQuery,
      GetInventoryItemCategoriesResult
    >(
      new GetInventoryItemCategoriesQuery(
        user.tenantId,
        params.page,
        params.limit,
        params.search,
      ),
    );

    return {
      message: 'Inventory item categories retrieved successfully',
      data: result,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.PROPERTY_EDIT)
  @ApiOperation({ summary: 'Create an inventory item category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  async createCategory(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateInventoryItemCategoryDto,
  ) {
    const result = await this.commandBus.execute<
      CreateInventoryItemCategoryCommand,
      CreateInventoryItemCategoryResult
    >(
      new CreateInventoryItemCategoryCommand(
        user.tenantId,
        dto.name,
        dto.description ?? null,
        user.userId,
        user.email,
      ),
    );

    return {
      message: 'Inventory item category created successfully',
      data: result,
    };
  }
}
