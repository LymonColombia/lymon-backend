export const LOW_STOCK_ALERT_EVENT = 'inventory.low-stock.alert';

export class LowStockAlertEvent {
  constructor(
    public readonly tenantId: string,
    public readonly propertyId: string,
    public readonly propertyName: string,
    public readonly itemId: string,
    public readonly itemName: string,
    public readonly itemSku: string,
    public readonly minStock: number,
    public readonly previousStock: number,
    public readonly currentStock: number,
    public readonly movementType: string,
    public readonly movementQuantity: number,
  ) {}
}
