import { CreateIncidentReportHandler } from '@/application/incident-report/commands/create-incident-report.handler';
import { CreateIncidentReportCommand } from '@/application/incident-report/commands/create-incident-report.command';
import { CreateIncidentReportResult } from '@/application/incident-report/commands/create-incident-report.result';
import { IncidentReportRepository } from '@/domain/incident-report/repositories/incident-report.repository';
import { PropertyRepository } from '@/domain/property/repositories/property.repository';
import { createIncidentReportRepositoryMock } from '@test/shared/mocks/repositories/incident-report-repository.mock';
import { createPropertyRepositoryMock } from '@test/shared/mocks/repositories/property-repository.mock';
import { makeProperty } from '@test/shared/fixtures/property.fixture';
import { createEventEmitterMock } from '@test/shared/mocks/services/event-emitter.mock';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const REPORT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c700000000';

describe('CreateIncidentReportHandler', () => {
  let handler: CreateIncidentReportHandler;
  let reportRepository: jest.Mocked<IncidentReportRepository>;
  let propertyRepository: jest.Mocked<PropertyRepository>;
  let eventEmitter: ReturnType<typeof createEventEmitterMock>;

  beforeEach(() => {
    reportRepository = createIncidentReportRepositoryMock();
    propertyRepository = createPropertyRepositoryMock();
    propertyRepository.findById.mockResolvedValue(makeProperty());
    eventEmitter = createEventEmitterMock();

    handler = new CreateIncidentReportHandler(
      reportRepository,
      propertyRepository,
      eventEmitter as any,
    );
  });

  describe('when creating a valid incident report', () => {
    it('saves the report and returns the reportId', async () => {
      reportRepository.save.mockResolvedValue(REPORT_ID);

      const result = await handler.execute(
        new CreateIncidentReportCommand(
          '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
          '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
          'Broken window',
          'The window in room 3 is cracked',
          ['https://img.example.com/broken.jpg'],
          '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
          'owner@example.com',
        ),
      );

      expect(result).toBeInstanceOf(CreateIncidentReportResult);
      expect(result.reportId).toBe(REPORT_ID);
      expect(reportRepository.save).toHaveBeenCalledTimes(1);
    });

    it('emits INCIDENT_REPORT_CREATED audit event', async () => {
      reportRepository.save.mockResolvedValue(REPORT_ID);

      await handler.execute(
        new CreateIncidentReportCommand(
          '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
          '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
          'Broken window',
          'The window in room 3 is cracked',
          [],
          '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
          'owner@example.com',
        ),
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ entityType: 'INCIDENT_REPORT' }),
      );
    });
  });

  describe('when the property is unknown or belongs to another tenant', () => {
    it('throws NotFound instead of hitting the database', async () => {
      propertyRepository.findById.mockResolvedValue(null);

      await expect(
        handler.execute(
          new CreateIncidentReportCommand(
            '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
            '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
            'Broken window',
            'The window in room 3 is cracked',
            [],
            '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
            'owner@example.com',
          ),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(reportRepository.save).not.toHaveBeenCalled();
    });

    it('throws Forbidden when the property belongs to another tenant', async () => {
      propertyRepository.findById.mockResolvedValue(
        makeProperty({ tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c900000000' }),
      );

      await expect(
        handler.execute(
          new CreateIncidentReportCommand(
            '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
            '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
            'Broken window',
            'The window in room 3 is cracked',
            [],
            '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
            'owner@example.com',
          ),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(reportRepository.save).not.toHaveBeenCalled();
    });
  });
});
