import { GetIncidentReportsByPropertyQueryHandler } from '@/application/incident-report/queries/GetIncidentReportsByProperty/get-incident-reports-by-property.query-handler';
import { GetIncidentReportsByPropertyQuery } from '@/application/incident-report/queries/GetIncidentReportsByProperty/get-incident-reports-by-property.query';
import { GetIncidentReportsByPropertyResult } from '@/application/incident-report/queries/GetIncidentReportsByProperty/get-incident-reports-by-property.result';
import { IncidentReportRepository } from '@/domain/incident-report/repositories/incident-report.repository';
import { createIncidentReportRepositoryMock } from '@test/shared/mocks/repositories/incident-report-repository.mock';
import { makeIncidentReport } from '@test/shared/fixtures/incident-report.fixture';

describe('GetIncidentReportsByPropertyQueryHandler', () => {
  let handler: GetIncidentReportsByPropertyQueryHandler;
  let reportRepository: jest.Mocked<IncidentReportRepository>;

  beforeEach(() => {
    reportRepository = createIncidentReportRepositoryMock();
    handler = new GetIncidentReportsByPropertyQueryHandler(reportRepository);
  });

  describe('when reports exist for the property', () => {
    it('returns paginated reports', async () => {
      const reports = [
        makeIncidentReport({ id: 'report-1', title: 'Broken window' }),
        makeIncidentReport({ id: 'report-2', title: 'Leak in bathroom' }),
        makeIncidentReport({ id: 'report-3', title: 'AC malfunction' }),
      ];
      reportRepository.findByPropertyId.mockResolvedValue(reports);

      const result = await handler.execute(
        new GetIncidentReportsByPropertyQuery(
          '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
          '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
          1,
          2,
        ),
      );

      expect(result).toBeInstanceOf(GetIncidentReportsByPropertyResult);
      expect(result.reports).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
    });

    it('returns second page correctly', async () => {
      const reports = [
        makeIncidentReport({ id: 'report-1' }),
        makeIncidentReport({ id: 'report-2' }),
        makeIncidentReport({ id: 'report-3' }),
      ];
      reportRepository.findByPropertyId.mockResolvedValue(reports);

      const result = await handler.execute(
        new GetIncidentReportsByPropertyQuery(
          '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
          '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
          2,
          2,
        ),
      );

      expect(result.reports).toHaveLength(1);
      expect(result.total).toBe(3);
      expect(result.page).toBe(2);
    });
  });

  describe('when no reports exist for the property', () => {
    it('returns empty list with total 0', async () => {
      reportRepository.findByPropertyId.mockResolvedValue([]);

      const result = await handler.execute(
        new GetIncidentReportsByPropertyQuery(
          '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
          '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
        ),
      );

      expect(result).toBeInstanceOf(GetIncidentReportsByPropertyResult);
      expect(result.reports).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});
