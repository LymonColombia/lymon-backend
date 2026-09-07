import {
  TransactionContext,
  TransactionManager,
} from '@/domain/shared/transaction-manager.interface';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { Prisma } from '@/infrastructure/persistence/prisma/generated/client';

class PrismaTransactionContext implements TransactionContext {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  getContext(): Prisma.TransactionClient {
    return this.tx;
  }
}

@Injectable()
export class PrismaTransactionManager implements TransactionManager {
  constructor(private readonly prisma: PrismaService) {}

  async executeInTransaction<T>(
    operation: (context: TransactionContext) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction((tx) =>
      operation(new PrismaTransactionContext(tx)),
    );
  }
}
