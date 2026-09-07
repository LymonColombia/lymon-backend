import { IncidentReportController } from '@/presentation/controllers/incident-report.controller';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Permission } from '@/domain/role/value-objects/permission.vo';

describe('IncidentReportController', () => {
  let controller: IncidentReportController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  const baseUser = {
    userId: '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
    email: 'staff@test.com',
    tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
    activePlan: 'TRIAL',
    isOwner: false,
    emailVerified: true,
    roleAssignments: [
      {
        roleId: 'r1',
        roleName: 'STAFF',
        permissions: [Permission.INCIDENT_REPORT_EDIT],
        scope: 'SYSTEM',
      },
    ],
  } as any;

  beforeEach(() => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };

    controller = new IncidentReportController(
      commandBus as unknown as CommandBus,
      queryBus as unknown as QueryBus,
    );
  });

  it('creates incident report', async () => {
    commandBus.execute.mockResolvedValue({ reportId: 'rep-1' });

    const result = await controller.create(baseUser, {
      propertyId: '65f1a1a2-b3c4-d5e6-f7a8-b9c300000000',
      title: 'Broken lock',
      description: 'Door lock failed',
      attachmentUrls: ['https://img.test/1.png'],
    });

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      message: 'Incident report created successfully',
      data: { reportId: 'rep-1' },
    });
  });

  it('returns incident report by property', async () => {
    queryBus.execute.mockResolvedValue({
      reports: [{ id: 'rep-1' }],
      total: 1,
      page: 1,
      limit: 10,
    });

    const result = await controller.findByProperty(
      baseUser,
      '65f1a1a2-b3c4-d5e6-f7a8-b9c300000000',
      1,
      10,
    );

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(result.total).toBe(1);
  });

  it('updates incident report with canManageAll=true for owner', async () => {
    commandBus.execute.mockResolvedValue({ reportId: 'rep-1' });
    const ownerUser = { ...baseUser, isOwner: true };

    const result = await controller.update(ownerUser, 'rep-1', {
      title: 'Updated',
      description: 'Updated desc',
      attachmentUrls: [],
    });

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(result.data.reportId).toBe('rep-1');
  });

  it('deletes incident report', async () => {
    commandBus.execute.mockResolvedValue(undefined);

    await controller.remove(baseUser, 'rep-1');

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
  });
});
