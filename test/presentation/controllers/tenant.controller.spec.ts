import { TenantController } from '@/presentation/controllers/tenant.controller';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Permission } from '@/domain/role/value-objects/permission.vo';

describe('TenantController', () => {
  let controller: TenantController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  const user = {
    userId: '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
    email: 'owner@test.com',
    tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
    activePlan: 'TRIAL',
    isOwner: true,
    emailVerified: true,
    roleAssignments: [
      {
        roleId: 'r1',
        roleName: 'OWNER',
        permissions: [Permission.TENANT_SETTINGS_EDIT],
        scope: 'SYSTEM',
      },
    ],
  } as any;

  beforeEach(() => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };

    controller = new TenantController(
      commandBus as unknown as CommandBus,
      queryBus as unknown as QueryBus,
    );
  });

  it('returns tenant profile data', async () => {
    queryBus.execute.mockResolvedValue({ profile: { name: 'Tenant A' } });

    const result = await controller.getProfile(user);

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: { name: 'Tenant A' } });
  });

  it('updates tenant profile and returns tenant id', async () => {
    commandBus.execute.mockResolvedValue({ tenantId: user.tenantId });

    const result = await controller.updateProfile(user, {
      name: 'Tenant Renamed',
      contactPhone: '12345',
      address: 'Address',
      description: 'A description',
      theme: { primary: '#1A73E8' },
      logoKey: `${user.tenantId}/logos/1.png`,
    });

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      message: 'Tenant profile updated successfully',
      data: { tenantId: user.tenantId },
    });
  });
});
