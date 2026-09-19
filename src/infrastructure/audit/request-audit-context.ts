import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestAuditContext {
  ipAddress?: string;
}

const requestAuditContext = new AsyncLocalStorage<RequestAuditContext>();

export function enterRequestAuditContext(context: RequestAuditContext): void {
  requestAuditContext.enterWith(context);
}

export function getRequestAuditContext(): RequestAuditContext | undefined {
  return requestAuditContext.getStore();
}
