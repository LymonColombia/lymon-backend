import { IncidentReport } from '@/domain/incident-report/entities/incident-report.entity';
import { IncidentReportId } from '@/domain/incident-report/value-objects/incident-report-id.vo';

export const INCIDENT_REPORT_FIXTURE_DEFAULTS = {
  id: '65f1a1a2-b3c4-d5e6-f7a8-b9c700000000',
  tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
  propertyId: '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
  createdBy: '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
  title: 'Broken window',
  description: 'The window in room 3 is cracked',
  attachmentUrls: [] as string[],
};

export function makeIncidentReport(
  overrides?: Partial<typeof INCIDENT_REPORT_FIXTURE_DEFAULTS>,
): IncidentReport {
  const merged = { ...INCIDENT_REPORT_FIXTURE_DEFAULTS, ...overrides };

  return IncidentReport.reconstitute({
    id: IncidentReportId.create(merged.id),
    tenantId: merged.tenantId,
    propertyId: merged.propertyId,
    createdBy: merged.createdBy,
    title: merged.title,
    description: merged.description,
    attachmentUrls: merged.attachmentUrls,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
