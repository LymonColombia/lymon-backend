export const TENANT_REGISTERED_EVENT = 'tenant.registered';

export class TenantRegisteredEvent {
  constructor(public readonly tenantId: string) {}
}
