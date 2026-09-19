export interface MonthlySpendingItem {
  year: number;
  month: number;
  label: string;
  totalSpend: number;
}

export class GetGuestMonthlySpendingResult {
  constructor(public readonly items: MonthlySpendingItem[]) {}
}
