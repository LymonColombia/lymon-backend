import { Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DenyRefundCommand } from './deny-refund.command';
import {
  REFUND_REQUEST_REPOSITORY,
  type RefundRequestRepository,
} from '@/domain/refund/repositories/refund-request.repository';

@CommandHandler(DenyRefundCommand)
export class DenyRefundHandler implements ICommandHandler<DenyRefundCommand> {
  constructor(
    @Inject(REFUND_REQUEST_REPOSITORY)
    private readonly refundRequestRepository: RefundRequestRepository,
  ) {}

  async execute(command: DenyRefundCommand): Promise<void> {
    const refundRequest = await this.refundRequestRepository.findById(
      command.refundRequestId,
    );

    if (!refundRequest) {
      throw new NotFoundException('Refund request not found');
    }

    if (refundRequest.getTenantId().toString() !== command.tenantId) {
      throw new NotFoundException('Refund request not found');
    }

    try {
      refundRequest.deny(command.actorId);
    } catch {
      throw new BadRequestException(
        'Refund request cannot be denied in its current state',
      );
    }

    await this.refundRequestRepository.save(refundRequest);
  }
}
