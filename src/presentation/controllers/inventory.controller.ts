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
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/infrastructure/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/infrastructure/auth/guards/permission.guard';
import { RequirePermission } from '@/infrastructure/auth/decorators/require-permission.decorator';
import { Permission } from '@/domain/role/value-objects/permission.vo';
import { CurrentUser } from '@/infrastructure/auth/decorators/current-user.decorator';
import { type JwtPayload } from '@/application/auth/services/jwt.service';
import { CreateInventoryItemDto } from '@/presentation/dtos/inventory/create-inventory-item.dto';
import { UpdateInventoryItemDto } from '@/presentation/dtos/inventory/update-inventory-item.dto';
import { RecordInventoryMovementDto } from '@/presentation/dtos/inventory/record-inventory-movement.dto';
import { UpdateInventoryItemSupplierDto } from '@/presentation/dtos/inventory/update-inventory-item-supplier.dto';
import { CreateInventoryItemCommand } from '@/application/inventory/commands/create-inventory-item/create-inventory-item.command';
import { CreateInventoryItemResult } from '@/application/inventory/commands/create-inventory-item/create-inventory-item.result';
import { UpdateInventoryItemCommand } from '@/application/inventory/commands/update-inventory-item/update-inventory-item.command';
import { UpdateInventoryItemResult } from '@/application/inventory/commands/update-inventory-item/update-inventory-item.result';
import { RecordInventoryMovementCommand } from '@/application/inventory/commands/record-inventory-movement/record-inventory-movement.command';
import { RecordInventoryMovementResult } from '@/application/inventory/commands/record-inventory-movement/record-inventory-movement.result';
import { DeleteInventoryItemCommand } from '@/application/inventory/commands/delete-inventory-item/delete-inventory-item.command';
import { AssociateSupplierToItemCommand } from '@/application/inventory/commands/associate-supplier-to-item/associate-supplier-to-item.command';
import { AssociateSupplierToItemResult } from '@/application/inventory/commands/associate-supplier-to-item/associate-supplier-to-item.result';
import { RemoveSupplierFromItemCommand } from '@/application/inventory/commands/remove-supplier-from-item/remove-supplier-from-item.command';
import { RemoveSupplierFromItemResult } from '@/application/inventory/commands/remove-supplier-from-item/remove-supplier-from-item.result';
import { GetInventoryItemsByPropertyQuery } from '@/application/inventory/queries/get-inventory-items-by-property/get-inventory-items-by-property.query';
import { GetInventoryItemsByPropertyResult } from '@/application/inventory/queries/get-inventory-items-by-property/get-inventory-items-by-property.result';
import { GetLowStockItemsByPropertyQuery } from '@/application/inventory/queries/get-low-stock-items-by-property/get-low-stock-items-by-property.query';
import { GetLowStockItemsByPropertyResult } from '@/application/inventory/queries/get-low-stock-items-by-property/get-low-stock-items-by-property.result';

@ApiTags('inventory')
@ApiBearerAuth('JWT-auth')
@Controller('properties/:propertyId/inventory')
export class InventoryController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('items')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.PROPERTY_EDIT)
  @ApiOperation({ summary: 'Create a stock inventory item for a property' })
  @ApiResponse({
    status: 201,
    description: 'Inventory item created successfully',
  })
  async createItem(
    @CurrentUser() user: JwtPayload,
    @Param('propertyId') propertyId: string,
    @Body() dto: CreateInventoryItemDto,
  ) {
    const result = await this.commandBus.execute<
      CreateInventoryItemCommand,
      CreateInventoryItemResult
    >(
      new CreateInventoryItemCommand(
        user.tenantId,
        propertyId,
        dto.sku,
        dto.name,
        dto.categoryId,
        dto.unit,
        dto.minStock,
        dto.initialStock ?? 0,
        user.userId,
        user.email,
      ),
    );

    return {
      message: 'Inventory item created successfully',
      data: result,
    };
  }

  @Patch('items/:itemId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.PROPERTY_EDIT)
  @ApiOperation({ summary: 'Update a stock inventory item for a property' })
  @ApiResponse({
    status: 200,
    description: 'Inventory item updated successfully',
  })
  async updateItem(
    @CurrentUser() user: JwtPayload,
    @Param('propertyId') propertyId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    const result = await this.commandBus.execute<
      UpdateInventoryItemCommand,
      UpdateInventoryItemResult
    >(
      new UpdateInventoryItemCommand(
        user.tenantId,
        propertyId,
        itemId,
        dto.name,
        dto.categoryId,
        dto.unit,
        dto.minStock,
        dto.currentStock,
        user.userId,
        user.email,
      ),
    );

    return {
      message: 'Inventory item updated successfully',
      data: result,
    };
  }

  @Post('movements')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.PROPERTY_EDIT)
  @ApiOperation({ summary: 'Record stock movement (IN, OUT, ADJUSTMENT)' })
  @ApiResponse({
    status: 201,
    description: 'Inventory movement recorded successfully',
  })
  async recordMovement(
    @CurrentUser() user: JwtPayload,
    @Param('propertyId') propertyId: string,
    @Body() dto: RecordInventoryMovementDto,
  ) {
    const result = await this.commandBus.execute<
      RecordInventoryMovementCommand,
      RecordInventoryMovementResult
    >(
      new RecordInventoryMovementCommand(
        user.tenantId,
        propertyId,
        dto.itemId,
        dto.type,
        dto.quantity,
        dto.reason,
        dto.reference ?? null,
        user.userId,
        user.email,
      ),
    );

    return {
      message: 'Inventory movement recorded successfully',
      data: result,
    };
  }

  @Get('items')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.PROPERTY_VIEW)
  @ApiOperation({ summary: 'Get all inventory items by property' })
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
    name: 'supplierId',
    required: false,
    type: String,
    description: 'Filter by supplier ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Inventory items retrieved successfully',
  })
  async getItems(
    @CurrentUser() user: JwtPayload,
    @Param('propertyId') propertyId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('supplierId') supplierId?: string,
  ) {
    const result: GetInventoryItemsByPropertyResult =
      await this.queryBus.execute<
        GetInventoryItemsByPropertyQuery,
        GetInventoryItemsByPropertyResult
      >(
        new GetInventoryItemsByPropertyQuery(
          user.tenantId,
          propertyId,
          page,
          limit,
          supplierId,
        ),
      );

    return {
      message: 'Inventory items retrieved successfully',
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  @Get('alerts/low-stock')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.PROPERTY_VIEW)
  @ApiOperation({ summary: 'Get low stock alerts by property' })
  @ApiResponse({
    status: 200,
    description: 'Low stock items retrieved successfully',
  })
  async getLowStock(
    @CurrentUser() user: JwtPayload,
    @Param('propertyId') propertyId: string,
  ) {
    const result = await this.queryBus.execute<
      GetLowStockItemsByPropertyQuery,
      GetLowStockItemsByPropertyResult
    >(new GetLowStockItemsByPropertyQuery(user.tenantId, propertyId));

    return {
      message: 'Low stock items retrieved successfully',
      data: result.items,
    };
  }

  @Delete('items/:itemId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.PROPERTY_EDIT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a stock inventory item for a property' })
  @ApiResponse({
    status: 204,
    description: 'Inventory item deleted successfully',
  })
  async deleteItem(
    @CurrentUser() user: JwtPayload,
    @Param('propertyId') propertyId: string,
    @Param('itemId') itemId: string,
  ) {
    await this.commandBus.execute<DeleteInventoryItemCommand, void>(
      new DeleteInventoryItemCommand(user.tenantId, propertyId, itemId),
    );
  }

  @Patch('items/:itemId/supplier')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.PROPERTY_EDIT)
  @ApiOperation({
    summary: 'Associate or remove a supplier from an inventory item',
  })
  @ApiResponse({
    status: 200,
    description: 'Inventory item supplier updated successfully',
  })
  async updateItemSupplier(
    @CurrentUser() user: JwtPayload,
    @Param('propertyId') propertyId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateInventoryItemSupplierDto,
  ) {
    if (dto.supplierId === null) {
      const result = await this.commandBus.execute<
        RemoveSupplierFromItemCommand,
        RemoveSupplierFromItemResult
      >(
        new RemoveSupplierFromItemCommand(
          user.tenantId,
          propertyId,
          itemId,
          user.userId,
          user.email,
        ),
      );

      return {
        message: 'Inventory item supplier removed successfully',
        data: result,
      };
    }

    const result = await this.commandBus.execute<
      AssociateSupplierToItemCommand,
      AssociateSupplierToItemResult
    >(
      new AssociateSupplierToItemCommand(
        user.tenantId,
        propertyId,
        itemId,
        dto.supplierId,
        user.userId,
        user.email,
      ),
    );

    return {
      message: 'Inventory item supplier updated successfully',
      data: result,
    };
  }
}
