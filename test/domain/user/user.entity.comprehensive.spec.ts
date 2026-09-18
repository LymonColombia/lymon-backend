import {
  User,
  UserRoleEnum,
  type RoleAssignment,
} from '@/domain/user/entities/user.entity';
import { Email } from '@/domain/shared/value-objects/email.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

describe('User Entity - Extended Coverage', () => {
  describe('Password reset functionality', () => {
    it('setResetToken should set token and expiry date', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'hashed-password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );
      const hashedToken = 'reset-token-hash';
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour

      // Act
      user.setResetToken(hashedToken, expiresAt);

      // Assert
      expect(user.getResetPasswordToken()).toBe(hashedToken);
      expect(user.getResetPasswordExpires()).toEqual(expiresAt);
    });

    it('setResetToken should throw if token is empty', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'hashed-password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );

      // Act & Assert
      expect(() => {
        user.setResetToken('', new Date(Date.now() + 3600000));
      }).toThrow('Reset token cannot be empty');
    });

    it('setResetToken should throw if expiry is in the past', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'hashed-password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );
      const pastDate = new Date(Date.now() - 3600000);

      // Act & Assert
      expect(() => {
        user.setResetToken('valid-token', pastDate);
      }).toThrow('Reset token expiration must be in the future');
    });

    it('getResetPasswordToken should return undefined if not set', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'hashed-password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );

      // Assert
      expect(user.getResetPasswordToken()).toBeUndefined();
    });

    it('getResetPasswordExpires should return undefined if not set', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'hashed-password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );

      // Assert
      expect(user.getResetPasswordExpires()).toBeUndefined();
    });

    it('clearResetToken should remove token and expiry', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'hashed-password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );
      const expiresAt = new Date(Date.now() + 3600000);
      user.setResetToken('token', expiresAt);

      // Act
      user.clearResetToken();

      // Assert
      expect(user.getResetPasswordToken()).toBeUndefined();
      expect(user.getResetPasswordExpires()).toBeUndefined();
    });

    it('isResetTokenValid should return false if no token is set', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'hashed-password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );

      // Assert
      expect(user.isResetTokenValid(new Date())).toBe(false);
    });

    it('isResetTokenValid should return true if token is not expired', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'hashed-password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );
      const futureDate = new Date(Date.now() + 3600000);
      user.setResetToken('token', futureDate);

      // Assert
      expect(user.isResetTokenValid(new Date())).toBe(true);
    });

    it('isResetTokenValid should return false if token is expired', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'hashed-password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );
      const futureDate = new Date(Date.now() + 1000); // 1 second in future
      user.setResetToken('token', futureDate);

      // Act & Assert - pass a date that's after token expiration
      const dateAfterExpiration = new Date(Date.now() + 2000);
      expect(user.isResetTokenValid(dateAfterExpiration)).toBe(false);
    });
  });

  describe('Password reset with token', () => {
    it('resetPasswordWithToken should change password when token is valid', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'old-password-hash',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );
      const futureDate = new Date(Date.now() + 3600000);
      user.setResetToken('valid-token', futureDate);

      // Act
      user.resetPasswordWithToken('new-password-hash', new Date());

      // Assert
      expect(user.getPasswordHash()).toBe('new-password-hash');
      expect(user.getResetPasswordToken()).toBeUndefined();
      expect(user.getResetPasswordExpires()).toBeUndefined();
    });

    it('resetPasswordWithToken should throw if token is expired', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'old-password-hash',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );
      // Set token with a very short expiration (1 second)
      const futureDate = new Date(Date.now() + 1000);
      user.setResetToken('expired-token', futureDate);

      // Create a date that's after the token expiration
      const dateAfterExpiration = new Date(Date.now() + 2000);

      // Act & Assert
      expect(() => {
        user.resetPasswordWithToken('new-password-hash', dateAfterExpiration);
      }).toThrow('Reset token is invalid or expired');
    });

    it('resetPasswordWithToken should throw if no token is set', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'old-password-hash',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );

      // Act & Assert
      expect(() => {
        user.resetPasswordWithToken('new-password-hash', new Date());
      }).toThrow('Reset token is invalid or expired');
    });
  });

  describe('Password changed tracking', () => {
    it('getPasswordChangedAt should return undefined initially', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'hashed-password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );

      // Assert
      expect(user.getPasswordChangedAt()).toBeUndefined();
    });

    it('getPasswordChangedAt should return date after changePassword', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'hashed-password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );
      const beforeChange = new Date();

      // Act
      user.changePassword('new-hashed-password');
      const afterChange = new Date();

      // Assert
      const passwordChangedAt = user.getPasswordChangedAt();
      expect(passwordChangedAt).toBeDefined();
      expect(passwordChangedAt!.getTime()).toBeGreaterThanOrEqual(
        beforeChange.getTime(),
      );
      expect(passwordChangedAt!.getTime()).toBeLessThanOrEqual(
        afterChange.getTime(),
      );
    });
  });

  describe('Email verification', () => {
    it('verifyEmail should set emailVerified to true', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'hashed-password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );

      // Act
      user.verifyEmail();

      // Assert
      expect(user.isEmailVerified()).toBe(true);
    });

    it('createStaff should create user with roleAssignments', () => {
      // Arrange
      const roleAssignments: RoleAssignment[] = [
        {
          roleId: 'ADMIN',
          scope: {
            type: 'PROPERTY',
            resourceIds: ['65f1a1a2-b3c4-d5e6-f7a8-b9c100000000'],
          },
        },
      ];

      // Act
      const user = User.createStaff(
        Email.create('staff@example.com'),
        'hashed-password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
        roleAssignments,
      );

      // Assert
      expect(user.getRoleAssignments()).toEqual(roleAssignments);
      expect(user.isOwner()).toBe(false);
      expect(user.isEmailVerified()).toBe(false);
    });
  });

  describe('Deprecated getRole method', () => {
    it('getRole should return OWNER when isOwnerFlag is true', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'hashed-password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );

      // Act & Assert
      expect(user.getRole()).toBe(UserRoleEnum.OWNER);
    });

    it('getRole should return STAFF when isOwnerFlag is false', () => {
      // Arrange
      const user = User.createStaff(
        Email.create('staff@example.com'),
        'hashed-password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
        [],
      );

      // Act & Assert
      expect(user.getRole()).toBe(UserRoleEnum.STAFF);
    });
  });
});
