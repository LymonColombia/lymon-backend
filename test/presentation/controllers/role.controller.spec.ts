import { QueryBus } from '@nestjs/cqrs';
import { RoleController } from '@/presentation/controllers/role.controller';
import { GetSystemRolesQuery } from '@/application/role/queries/GetSystemRoles/get-system-roles.query';

describe('RoleController', () => {
  let controller: RoleController;
  let queryBus: { execute: jest.Mock };

  beforeEach(() => {
    queryBus = { execute: jest.fn() };
    controller = new RoleController(queryBus as unknown as QueryBus);
  });

  it('returns system roles result', async () => {
    queryBus.execute.mockResolvedValue({
      roles: [{ id: 'r1', name: 'ADMIN', permissions: ['CRM_VIEW'] }],
    });

    const result = await controller.getSystemRoles();

    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(GetSystemRolesQuery),
    );
    expect(result).toEqual({
      roles: [{ id: 'r1', name: 'ADMIN', permissions: ['CRM_VIEW'] }],
    });
  });
});
