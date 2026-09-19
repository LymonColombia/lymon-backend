import { type IncidentReportDto } from '@/application/incident-report/queries/GetIncidentReportById/get-incident-report-by-id.result';

export class GetIncidentReportsByPropertyResult {
  constructor(
    public readonly reports: IncidentReportDto[],
    public readonly total: number,
    public readonly page: number,
    public readonly limit: number,
  ) {}
}
