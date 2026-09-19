import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CompleteTutorialCommand } from '@/application/user/commands/complete-tutorial/complete-tutorial.command';
import { Inject, NotFoundException } from '@nestjs/common';
import {
  type UserRepository,
  USER_REPOSITORY,
} from '@/domain/user/repositories/user.repository';
import { UserId } from '@/domain/user/entities/user.entity';

@CommandHandler(CompleteTutorialCommand)
export class CompleteTutorialHandler
  implements ICommandHandler<CompleteTutorialCommand>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(command: CompleteTutorialCommand): Promise<void> {
    const user = await this.userRepository.findById(
      UserId.createFromString(command.userId),
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.completeTutorial();
    await this.userRepository.save(user);
  }
}
