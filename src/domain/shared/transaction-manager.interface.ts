export const TRANSACTION_MANAGER = 'TRANSACTION_MANAGER';

export type TransactionContextData = object;

export interface TransactionManager {
  executeInTransaction<T>(
    operation: (context: TransactionContext) => Promise<T>,
  ): Promise<T>;
}

export interface TransactionContext {
  getContext(): TransactionContextData;
}
