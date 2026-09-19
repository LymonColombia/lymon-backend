import { Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveRefundCommand } from './approve-refund.command';
import {
  REFUND_REQUEST_REPOSITORY,
  type RefundRequestRepository,
} from '@/domain/refund/repositories/refund-request.repository';

@CommandHandler(ApproveRefundCommand)
export class ApproveRefundHandler implements ICommandHandler<ApproveRefundCommand> {
  constructor(
    @Inject(REFUND_REQUEST_REPOSITORY)
    private readonly refundRequestRepository: RefundRequestRepository,
  ) {}

  async execute(command: ApproveRefundCommand): Promise<void> {
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
      refundRequest.approve(command.actorId);
    } catch {
      throw new BadRequestException(
        'Refund request cannot be approved in its current state',
      );
    }

    await this.refundRequestRepository.save(refundRequest);
  }
}
