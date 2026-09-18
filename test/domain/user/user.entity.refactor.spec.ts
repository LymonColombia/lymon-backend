import {
  User,
  UserId,
  UserReconstitutionData,
  type RoleAssignment,
} from '@/domain/user/entities/user.entity';
import { Email } from '@/domain/shared/value-objects/email.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

describe('User Entity - Refactored reconstitute method', () => {
  describe('reconstitute with UserReconstitutionData', () => {
    it('should successfully reconstitute a user with all parameters', () => {
      // Arrange
      const userId = UserId.createFromString('user-123');
      const email = Email.create('test@example.com');
      const tenantId = TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000');
      const roleAssignments: RoleAssignment[] = [];
      const now = new Date();
      const resetToken = 'token-123';
      const tokenExpires = new Date(now.getTime() + 3600000); // 1 hour from now

      const reconstitutionData: UserReconstitutionData = {
        id: userId,
        email,
        passwordHash: 'hashed-password',
        tenantId,
        isOwnerFlag: true,
        roleAssignments,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
        resetPasswordToken: resetToken,
        resetPasswordExpires: tokenExpires,
        passwordChangedAt: now,
      };

      // Act
      const user = User.reconstitute(reconstitutionData);

      // Assert
      expect(user.getId()).toEqual(userId);
      expect(user.getEmail()).toEqual(email);
      expect(user.getPasswordHash()).toBe('hashed-password');
      expect(user.getTenantId()).toEqual(tenantId);
      expect(user.isOwner()).toBe(true);
      expect(user.isEmailVerified()).toBe(true);
      expect(user.getResetPasswordToken()).toBe(resetToken);
      expect(user.getResetPasswordExpires()).toEqual(tokenExpires);
    });

    it('should successfully reconstitute a user without optional parameters', () => {
      // Arrange
      const userId = UserId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c200000000');
      const email = Email.create('staff@example.com');
      const tenantId = TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000');
      const roleAssignments: RoleAssignment[] = [
        {
          roleId: 'ADMIN',
          scope: {
            type: 'PROPERTY',
            resourceIds: ['65f1a1a2-b3c4-d5e6-f7a8-b9c100000000'],
          },
        },
      ];
      const now = new Date();

      const reconstitutionData: UserReconstitutionData = {
        id: userId,
        email,
        passwordHash: 'hashed-password-456',
        tenantId,
        isOwnerFlag: false,
        roleAssignments,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
      };

      // Act
      const user = User.reconstitute(reconstitutionData);

      // Assert
      expect(user.getId()).toEqual(userId);
      expect(user.getEmail()).toEqual(email);
      expect(user.getTenantId()).toEqual(tenantId);
      expect(user.isOwner()).toBe(false);
      expect(user.isEmailVerified()).toBe(false);
      expect(user.getRoleAssignments()).toEqual(roleAssignments);
      expect(user.getResetPasswordToken()).toBeUndefined();
      expect(user.getResetPasswordExpires()).toBeUndefined();
      expect(user.getPasswordChangedAt()).toBeUndefined();
    });

    it('should maintain user invariants after reconstitution', () => {
      // Arrange
      const userId = UserId.createFromString('user-789');
      const email = Email.create('owner@example.com');
      const tenantId = TenantId.createFromString('tenant-789');
      const now = new Date();

      const reconstitutionData: UserReconstitutionData = {
        id: userId,
        email,
        passwordHash: 'hashed-password-789',
        tenantId,
        isOwnerFlag: true,
        roleAssignments: [],
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      };

      // Act
      const user = User.reconstitute(reconstitutionData);

      // Assert - verify that we can perform operations on the reconstituted user
      expect(() => user.verifyEmail()).not.toThrow();
      expect(() => user.changePassword('new-hashed-password')).not.toThrow();
      expect(() => {
        const futureDate = new Date(now.getTime() + 7200000);
        user.setResetToken('reset-token', futureDate);
      }).not.toThrow();
    });
  });
});
