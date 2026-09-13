import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UpdateIncidentReportHandler } from '@/application/incident-report/commands/update-incident-report.handler';
import { UpdateIncidentReportCommand } from '@/application/incident-report/commands/update-incident-report.command';
import { UpdateIncidentReportResult } from '@/application/incident-report/commands/update-incident-report.result';
import { IncidentReportRepository } from '@/domain/incident-report/repositories/incident-report.repository';
import { createIncidentReportRepositoryMock } from '@test/shared/mocks/repositories/incident-report-repository.mock';
import { createEventEmitterMock } from '@test/shared/mocks/services/event-emitter.mock';
import {
  makeIncidentReport,
  INCIDENT_REPORT_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/incident-report.fixture';

describe('UpdateIncidentReportHandler', () => {
  let handler: UpdateIncidentReportHandler;
  let reportRepository: jest.Mocked<IncidentReportRepository>;
  let eventEmitter: ReturnType<typeof createEventEmitterMock>;

  beforeEach(() => {
    reportRepository = createIncidentReportRepositoryMock();
    eventEmitter = createEventEmitterMock();

    handler = new UpdateIncidentReportHandler(
      reportRepository,
      eventEmitter as any,
    );
  });

  describe('when the report does not exist', () => {
    it('throws NotFoundException', async () => {
      reportRepository.findById.mockResolvedValue(null);

      await expect(
        handler.execute(
          new UpdateIncidentReportCommand(
            'non-existent',
            '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
            'Updated title',
            undefined,
            undefined,
            '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
            'owner@example.com',
            true,
          ),
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('when the report belongs to a different tenant', () => {
    it('throws NotFoundException', async () => {
      reportRepository.findById.mockResolvedValue(
        makeIncidentReport({ tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c900000000' }),
      );

      await expect(
        handler.execute(
          new UpdateIncidentReportCommand(
            INCIDENT_REPORT_FIXTURE_DEFAULTS.id,
            '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
            'Updated title',
            undefined,
            undefined,
            '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
            'owner@example.com',
            true,
          ),
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('when STAFF tries to edit another user report', () => {
    it('throws ForbiddenException', async () => {
      reportRepository.findById.mockResolvedValue(
        makeIncidentReport({ createdBy: 'another-user' }),
      );

      await expect(
        handler.execute(
          new UpdateIncidentReportCommand(
            INCIDENT_REPORT_FIXTURE_DEFAULTS.id,
            '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
            'Updated title',
            undefined,
            undefined,
            '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
            'owner@example.com',
            false, // canManageAll = false (STAFF level)
          ),
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('when OWNER/ADMIN edits any report', () => {
    it('updates the report, saves, and emits audit event', async () => {
      reportRepository.findById.mockResolvedValue(
        makeIncidentReport({ createdBy: 'another-user' }),
      );

      const result = await handler.execute(
        new UpdateIncidentReportCommand(
          INCIDENT_REPORT_FIXTURE_DEFAULTS.id,
          '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
          'Updated title',
          'Updated description',
          ['https://img.example.com/new.jpg'],
          '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
          'owner@example.com',
          true, // canManageAll = true (OWNER/ADMIN)
        ),
      );

      expect(result).toBeInstanceOf(UpdateIncidentReportResult);
      expect(result.reportId).toBe(INCIDENT_REPORT_FIXTURE_DEFAULTS.id);
      expect(reportRepository.save).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ entityType: 'INCIDENT_REPORT' }),
      );
    });
  });

  describe('when STAFF edits their own report', () => {
    it('updates successfully', async () => {
      reportRepository.findById.mockResolvedValue(
        makeIncidentReport({ createdBy: '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000' }),
      );

      const result = await handler.execute(
        new UpdateIncidentReportCommand(
          INCIDENT_REPORT_FIXTURE_DEFAULTS.id,
          '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
          'Updated title',
          undefined,
          undefined,
          '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
          'owner@example.com',
          false, // canManageAll = false (STAFF)
        ),
      );

      expect(result).toBeInstanceOf(UpdateIncidentReportResult);
      expect(result.reportId).toBe(INCIDENT_REPORT_FIXTURE_DEFAULTS.id);
      expect(reportRepository.save).toHaveBeenCalledTimes(1);
    });
  });
});
