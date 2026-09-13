import {
  User,
  UserId,
  UserRoleEnum,
  UserReconstitutionData,
  type RoleAssignment,
} from '@/domain/user/entities/user.entity';
import { Email } from '@/domain/shared/value-objects/email.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

describe('User Entity - Full Coverage', () => {
  describe('UserId Value Object', () => {
    it('createFromString should create a valid UserId', () => {
      // Act
      const userId = UserId.createFromString('user-123');

      // Assert
      expect(userId.toString()).toBe('user-123');
    });

    it('createFromString should throw if value is empty', () => {
      // Act & Assert
      expect(() => UserId.createFromString('')).toThrow(
        'UserId cannot be empty',
      );
    });

    it('createFromString should throw if value is whitespace', () => {
      // Act & Assert
      expect(() => UserId.createFromString('   ')).toThrow(
        'UserId cannot be empty',
      );
    });

    it('equals should return true for same values', () => {
      // Arrange
      const userId1 = UserId.createFromString('user-123');
      const userId2 = UserId.createFromString('user-123');

      // Act & Assert
      expect(userId1.equals(userId2)).toBe(true);
    });

    it('equals should return false for different values', () => {
      // Arrange
      const userId1 = UserId.createFromString('user-123');
      const userId2 = UserId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c200000000');

      // Act & Assert
      expect(userId1.equals(userId2)).toBe(false);
    });
  });

  describe('User Factory Methods', () => {
    describe('createOwner', () => {
      it('should create an owner user with correct defaults', () => {
        // Arrange
        const email = Email.create('owner@example.com');
        const passwordHash = 'hashed-password';
        const tenantId = TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000');

        // Act
        const user = User.createOwner(email, passwordHash, tenantId);

        // Assert
        expect(user.getId()).toBeNull();
        expect(user.getEmail()).toEqual(email);
        expect(user.getPasswordHash()).toBe('hashed-password');
        expect(user.getTenantId()).toEqual(tenantId);
        expect(user.isOwner()).toBe(true);
        expect(user.isEmailVerified()).toBe(false);
        expect(user.getRoleAssignments()).toEqual([]);
        expect(user.getResetPasswordToken()).toBeUndefined();
      });
    });

    describe('createStaff', () => {
      it('should create a staff user with role assignments', () => {
        // Arrange
        const email = Email.create('staff@example.com');
        const passwordHash = 'hashed-password';
        const tenantId = TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000');
        const roleAssignments: RoleAssignment[] = [
          {
            roleId: 'VIEWER',
            scope: {
              type: 'PROPERTY',
              resourceIds: [
                '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
                '65f1a1a2-b3c4-d5e6-f7a8-b9cd00000000',
              ],
            },
          },
          {
            roleId: 'EDITOR',
            scope: { type: 'UNIT', resourceIds: ['65f1a1a2-b3c4-d5e6-f7a8-b9c800000000'] },
          },
        ];

        // Act
        const user = User.createStaff(
          email,
          passwordHash,
          tenantId,
          roleAssignments,
        );

        // Assert
        expect(user.getId()).toBeNull();
        expect(user.getEmail()).toEqual(email);
        expect(user.getPasswordHash()).toBe('hashed-password');
        expect(user.getTenantId()).toEqual(tenantId);
        expect(user.isOwner()).toBe(false);
        expect(user.isEmailVerified()).toBe(false);
        expect(user.getRoleAssignments()).toEqual(roleAssignments);
      });

      it('should create a staff user with empty role assignments', () => {
        // Arrange & Act
        const user = User.createStaff(
          Email.create('staff@example.com'),
          'password',
          TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
          [],
        );

        // Assert
        expect(user.isOwner()).toBe(false);
        expect(user.getRoleAssignments()).toEqual([]);
      });
    });
  });

  describe('Role Management', () => {
    it('updateRoleAssignments should update and set updatedAt', () => {
      // Arrange
      const user = User.createStaff(
        Email.create('staff@example.com'),
        'password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
        [],
      );

      const newRoleAssignments: RoleAssignment[] = [
        { roleId: 'ADMIN', scope: { type: 'TENANT' } },
      ];

      // Act
      user.updateRoleAssignments(newRoleAssignments);

      // Assert
      expect(user.getRoleAssignments()).toEqual(newRoleAssignments);
    });

    it('getRoleAssignments should return a copy not the original array', () => {
      // Arrange
      const roleAssignments: RoleAssignment[] = [
        {
          roleId: 'VIEWER',
          scope: {
            type: 'PROPERTY',
            resourceIds: ['65f1a1a2-b3c4-d5e6-f7a8-b9c100000000'],
          },
        },
      ];
      const user = User.createStaff(
        Email.create('staff@example.com'),
        'password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
        roleAssignments,
      );

      // Act
      const retrievedAssignments = user.getRoleAssignments();
      retrievedAssignments.push({
        roleId: 'EDITOR',
        scope: { type: 'UNIT', resourceIds: ['65f1a1a2-b3c4-d5e6-f7a8-b9c800000000'] },
      });

      // Assert - original should still have only one assignment
      expect(user.getRoleAssignments()).toHaveLength(1);
      expect(user.getRoleAssignments()[0].roleId).toBe('VIEWER');
    });
  });

  describe('Getters - Data Access', () => {
    it('getId should return the user id', () => {
      // Arrange
      const userId = UserId.createFromString('user-789');
      const data: UserReconstitutionData = {
        id: userId,
        email: Email.create('test@example.com'),
        passwordHash: 'password',
        tenantId: TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
        isOwnerFlag: true,
        roleAssignments: [],
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const user = User.reconstitute(data);

      // Assert
      expect(user.getId()).toEqual(userId);
      expect(user.getId()?.toString()).toBe('user-789');
    });

    it('getEmail should return the email', () => {
      // Arrange
      const email = Email.create('myemail@example.com');
      const user = User.createOwner(
        email,
        'password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );

      // Act & Assert
      expect(user.getEmail()).toEqual(email);
    });

    it('getPasswordHash should return the password hash', () => {
      // Arrange
      const passwordHash = 'bcrypt-hash-value';
      const user = User.createOwner(
        Email.create('owner@example.com'),
        passwordHash,
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );

      // Act & Assert
      expect(user.getPasswordHash()).toBe('bcrypt-hash-value');
    });

    it('getTenantId should return the tenant id', () => {
      // Arrange
      const tenantId = TenantId.createFromString('tenant-xyz');
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'password',
        tenantId,
      );

      // Act & Assert
      expect(user.getTenantId()).toEqual(tenantId);
    });

    it('isOwner should return ownership status', () => {
      // Arrange
      const ownerUser = User.createOwner(
        Email.create('owner@example.com'),
        'password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );

      const staffUser = User.createStaff(
        Email.create('staff@example.com'),
        'password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
        [],
      );

      // Assert
      expect(ownerUser.isOwner()).toBe(true);
      expect(staffUser.isOwner()).toBe(false);
    });

    it('isEmailVerified should return email verification status', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );

      // Assert - initially false
      expect(user.isEmailVerified()).toBe(false);

      // Act
      user.verifyEmail();

      // Assert - after verification
      expect(user.isEmailVerified()).toBe(true);
    });
  });

  describe('Email Verification Flow', () => {
    it('verifyEmail should set emailVerified to true and update timestamp', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );
      // Act
      user.verifyEmail();

      // Assert
      expect(user.isEmailVerified()).toBe(true);
    });

    it('verifyEmail can be called multiple times without side effects', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );

      // Act
      user.verifyEmail();
      user.verifyEmail();

      // Assert
      expect(user.isEmailVerified()).toBe(true);
    });
  });

  describe('Password Management', () => {
    it('changePassword should update password hash and set passwordChangedAt', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'old-password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );

      const beforeChange = new Date();

      // Act
      user.changePassword('new-password-hash');

      const afterChange = new Date();

      // Assert
      expect(user.getPasswordHash()).toBe('new-password-hash');
      const passwordChangedAt = user.getPasswordChangedAt();
      expect(passwordChangedAt).toBeDefined();
      expect(passwordChangedAt!.getTime()).toBeGreaterThanOrEqual(
        beforeChange.getTime(),
      );
      expect(passwordChangedAt!.getTime()).toBeLessThanOrEqual(
        afterChange.getTime(),
      );
    });

    it('changePassword should throw on empty string', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );

      // Act & Assert
      expect(() => user.changePassword('')).toThrow(
        'Password hash cannot be empty',
      );
    });

    it('changePassword should throw on whitespace only', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );

      // Act & Assert
      expect(() => user.changePassword('   ')).toThrow(
        'Password hash cannot be empty',
      );
    });

    it('changePassword can be called multiple times', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'password1',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );

      // Act
      user.changePassword('password2');
      expect(user.getPasswordHash()).toBe('password2');

      user.changePassword('password3');
      expect(user.getPasswordHash()).toBe('password3');

      // Assert
      expect(user.getPasswordHash()).toBe('password3');
    });
  });

  describe('Password Reset Token Lifecycle', () => {
    it('setResetToken should set token and expiry', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );
      const futureDate = new Date(Date.now() + 3600000);

      // Act
      user.setResetToken('reset-token-hash', futureDate);

      // Assert
      expect(user.getResetPasswordToken()).toBe('reset-token-hash');
      expect(user.getResetPasswordExpires()).toEqual(futureDate);
    });

    it('clearResetToken should remove token and expiry', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );
      user.setResetToken('token', new Date(Date.now() + 3600000));

      // Act
      user.clearResetToken();

      // Assert
      expect(user.getResetPasswordToken()).toBeUndefined();
      expect(user.getResetPasswordExpires()).toBeUndefined();
    });

    it('resetPasswordWithToken complete flow', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'old-password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );
      const futureDate = new Date(Date.now() + 3600000);
      user.setResetToken('token', futureDate);

      // Act
      user.resetPasswordWithToken('new-password', new Date());

      // Assert
      expect(user.getPasswordHash()).toBe('new-password');
      expect(user.getResetPasswordToken()).toBeUndefined();
      expect(user.getResetPasswordExpires()).toBeUndefined();
    });
  });

  describe('Role Enum - Deprecated getRole()', () => {
    it('getRole returns OWNER for owner users', () => {
      // Arrange
      const user = User.createOwner(
        Email.create('owner@example.com'),
        'password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      );

      // Act & Assert
      expect(user.getRole()).toBe(UserRoleEnum.OWNER);
    });

    it('getRole returns STAFF for staff users', () => {
      // Arrange
      const user = User.createStaff(
        Email.create('staff@example.com'),
        'password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
        [],
      );

      // Act & Assert
      expect(user.getRole()).toBe(UserRoleEnum.STAFF);
    });
  });

  describe('User Reconstitution Edge Cases', () => {
    it('should reconstitute user with null id', () => {
      // Arrange
      const data: UserReconstitutionData = {
        id: UserId.createFromString('user-id'),
        email: Email.create('test@example.com'),
        passwordHash: 'password',
        tenantId: TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
        isOwnerFlag: false,
        roleAssignments: [{ roleId: 'VIEWER', scope: { type: 'TENANT' } }],
        emailVerified: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        resetPasswordToken: 'token',
        resetPasswordExpires: new Date('2024-01-03'),
        passwordChangedAt: new Date('2024-01-01T12:00:00'),
      };

      // Act
      const user = User.reconstitute(data);

      // Assert
      expect(user.getId()?.toString()).toBe('user-id');
      expect(user.isEmailVerified()).toBe(true);
      expect(user.getRoleAssignments()).toHaveLength(1);
      expect(user.getResetPasswordToken()).toBe('token');
      expect(user.getPasswordChangedAt()).toEqual(
        new Date('2024-01-01T12:00:00'),
      );
    });

    it('should handle multiple role assignments of different scopes', () => {
      // Arrange
      const roleAssignments: RoleAssignment[] = [
        { roleId: 'ADMIN', scope: { type: 'TENANT' } },
        {
          roleId: 'EDITOR',
          scope: {
            type: 'PROPERTY',
            resourceIds: [
              '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
              '65f1a1a2-b3c4-d5e6-f7a8-b9cd00000000',
            ],
          },
        },
        {
          roleId: 'VIEWER',
          scope: { type: 'UNIT', resourceIds: ['65f1a1a2-b3c4-d5e6-f7a8-b9c800000000'] },
        },
      ];

      const user = User.createStaff(
        Email.create('staff@example.com'),
        'password',
        TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
        roleAssignments,
      );

      // Act
      const retrieved = user.getRoleAssignments();

      // Assert
      expect(retrieved).toHaveLength(3);
      expect(retrieved[0].scope.type).toBe('TENANT');
      expect(retrieved[1].scope.type).toBe('PROPERTY');
      expect((retrieved[1].scope as any).resourceIds).toEqual([
        '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
        '65f1a1a2-b3c4-d5e6-f7a8-b9cd00000000',
      ]);
      expect(retrieved[2].scope.type).toBe('UNIT');
    });
  });
});
