import { IncidentReportId } from '@/domain/incident-report/value-objects/incident-report-id.vo';

export interface IIncidentReport {
  id: IncidentReportId;
  tenantId: string;
  propertyId: string;
  createdBy: string;
  title: string;
  description: string;
  attachmentUrls: string[];
  createdAt: Date;
  updatedAt: Date;
}
