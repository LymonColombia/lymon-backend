import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteUserCommand } from './delete-user.command';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  type UserRepository,
  USER_REPOSITORY,
} from '@/domain/user/repositories/user.repository';
import { UserId } from '@/domain/user/entities/user.entity';

@CommandHandler(DeleteUserCommand)
export class DeleteUserHandler implements ICommandHandler<DeleteUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    const userId = UserId.createFromString(command.userId);
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isOwner()) {
      throw new ForbiddenException(
        'Cannot delete the owner user. Delete the tenant instead to remove the property owner.',
      );
    }

    user.delete();
    await this.userRepository.save(user);
  }
}
