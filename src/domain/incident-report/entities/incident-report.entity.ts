import { IncidentReportId } from '@/domain/incident-report/value-objects/incident-report-id.vo';
import { IIncidentReport } from '../interfaces/incident-report.interface';

export class IncidentReport {
  private constructor(
    private readonly id: IncidentReportId | null,
    private readonly tenantId: string,
    private readonly propertyId: string,
    private readonly createdBy: string,
    private title: string,
    private description: string,
    private attachmentUrls: string[],
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(
    tenantId: string,
    propertyId: string,
    createdBy: string,
    title: string,
    description: string,
    attachmentUrls: string[] = [],
  ): IncidentReport {
    if (!tenantId || tenantId.trim() === '') {
      throw new Error('IncidentReport tenantId cannot be empty');
    }
    if (!propertyId || propertyId.trim() === '') {
      throw new Error('IncidentReport propertyId cannot be empty');
    }
    if (!createdBy || createdBy.trim() === '') {
      throw new Error('IncidentReport createdBy cannot be empty');
    }
    if (!title || title.trim() === '') {
      throw new Error('IncidentReport title cannot be empty');
    }
    if (!description || description.trim() === '') {
      throw new Error('IncidentReport description cannot be empty');
    }

    return new IncidentReport(
      null,
      tenantId.trim(),
      propertyId.trim(),
      createdBy.trim(),
      title.trim(),
      description.trim(),
      attachmentUrls,
      new Date(),
      new Date(),
    );
  }

  static reconstitute(data: IIncidentReport): IncidentReport {
    return new IncidentReport(
      data.id,
      data.tenantId,
      data.propertyId,
      data.createdBy,
      data.title,
      data.description,
      data.attachmentUrls,
      data.createdAt,
      data.updatedAt,
    );
  }

  getId(): IncidentReportId | null {
    return this.id;
  }

  getTenantId(): string {
    return this.tenantId;
  }

  getPropertyId(): string {
    return this.propertyId;
  }

  getCreatedBy(): string {
    return this.createdBy;
  }

  getTitle(): string {
    return this.title;
  }

  getDescription(): string {
    return this.description;
  }

  getAttachmentUrls(): string[] {
    return this.attachmentUrls;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  update(
    title?: string,
    description?: string,
    attachmentUrls?: string[],
  ): void {
    if (title !== undefined) {
      if (!title || title.trim() === '') {
        throw new Error('IncidentReport title cannot be empty');
      }
      this.title = title.trim();
    }
    if (description !== undefined) {
      if (!description || description.trim() === '') {
        throw new Error('IncidentReport description cannot be empty');
      }
      this.description = description.trim();
    }
    if (attachmentUrls !== undefined) {
      this.attachmentUrls = attachmentUrls;
    }
    this.updatedAt = new Date();
  }
}
