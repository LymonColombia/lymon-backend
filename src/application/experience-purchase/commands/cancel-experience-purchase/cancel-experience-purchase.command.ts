export type CancelExperiencePurchaseActor =
  | { type: 'tenant'; tenantId: string }
  | { type: 'guest'; guestAccountId: string };

export class CancelExperiencePurchaseCommand {
  constructor(
    public readonly purchaseId: string,
    public readonly actor: CancelExperiencePurchaseActor,
  ) {}
}
