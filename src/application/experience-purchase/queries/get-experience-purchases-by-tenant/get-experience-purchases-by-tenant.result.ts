export interface TenantExperiencePurchaseDto {
  id: string;
  experienceId: string;
  experienceName: string;
  guestAccountId: string;
  guestName: string;
  purchasedAt: Date;
  scheduledDate: Date | null;
  quantity: number;
  totalPriceCop: number;
  status: string;
}

export class GetExperiencePurchasesByTenantResult {
  readonly totalPages: number;

  constructor(
    readonly purchases: TenantExperiencePurchaseDto[],
    readonly total: number,
    readonly page: number,
    readonly limit: number,
  ) {
    this.totalPages = Math.ceil(total / limit);
  }
}
