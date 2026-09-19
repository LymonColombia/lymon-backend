import {
  RecoverPasswordHandler,
  RecoverPasswordResult,
} from '@/application/auth/commands/recover-password.handler';
import { RecoverPasswordCommand } from '@/application/auth/commands/recover-password.command';
import { UserRepository } from '@/domain/user/repositories/user.repository';
import { IEmailService } from '@/application/shared/services/email.service';
import { createUserRepositoryMock } from '@test/shared/mocks/repositories/user-repository.mock';
import { createEmailServiceMock } from '@test/shared/mocks/services/email-service.mock';
import {
  makeUser,
  USER_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/user.fixture';
import { Logger } from '@nestjs/common';

describe('RecoverPasswordHandler', () => {
  let handler: RecoverPasswordHandler;
  let userRepository: jest.Mocked<UserRepository>;
  let emailService: jest.Mocked<IEmailService>;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    userRepository = createUserRepositoryMock();
    emailService = createEmailServiceMock();

    handler = new RecoverPasswordHandler(userRepository, emailService);
  });

  describe('when user exists', () => {
    it('should generate reset token, save it to user and send recovery email', async () => {
      const user = makeUser();
      userRepository.findByEmail.mockResolvedValue(user);
      emailService.sendRecoveryEmail.mockResolvedValue(undefined);

      const setResetTokenSpy = jest.spyOn(user, 'setResetToken');

      const result = await handler.execute(
        new RecoverPasswordCommand(USER_FIXTURE_DEFAULTS.email),
      );

      expect(result).toBeInstanceOf(RecoverPasswordResult);
      expect(result.message).toBe(
        'If the email exists, a recovery link has been sent',
      );
      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        expect.objectContaining({ value: USER_FIXTURE_DEFAULTS.email }),
      );
      expect(setResetTokenSpy).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalledWith(user);
      expect(emailService.sendRecoveryEmail).toHaveBeenCalledWith(
        USER_FIXTURE_DEFAULTS.email,
        expect.any(String),
      );
    });
  });

  describe('when user does not exist', () => {
    it('should return success message without sending email (security wise)', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      const result = await handler.execute(
        new RecoverPasswordCommand('nonexistent@example.com'),
      );

      expect(result).toBeInstanceOf(RecoverPasswordResult);
      expect(result.message).toBe(
        'If the email exists, a recovery link has been sent',
      );
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(emailService.sendRecoveryEmail).not.toHaveBeenCalled();
    });
  });

  describe('when email service fails', () => {
    it('should catch error and still return success message (security wise)', async () => {
      const user = makeUser();
      userRepository.findByEmail.mockResolvedValue(user);
      emailService.sendRecoveryEmail.mockRejectedValue(
        new Error('Email service error'),
      );

      const result = await handler.execute(
        new RecoverPasswordCommand(USER_FIXTURE_DEFAULTS.email),
      );

      expect(result).toBeInstanceOf(RecoverPasswordResult);
      expect(result.message).toBe(
        'If the email exists, a recovery link has been sent',
      );
    });
  });

  describe('when save user fails', () => {
    it('should catch error and still return success message (security wise)', async () => {
      const user = makeUser();
      userRepository.findByEmail.mockResolvedValue(user);
      userRepository.save.mockRejectedValue(new Error('Database error'));

      const result = await handler.execute(
        new RecoverPasswordCommand(USER_FIXTURE_DEFAULTS.email),
      );

      expect(result).toBeInstanceOf(RecoverPasswordResult);
      expect(result.message).toBe(
        'If the email exists, a recovery link has been sent',
      );
    });
  });
});
