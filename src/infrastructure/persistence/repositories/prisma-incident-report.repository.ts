import { Injectable } from '@nestjs/common';
import { IncidentReport } from '@/domain/incident-report/entities/incident-report.entity';
import { IncidentReportRepository } from '@/domain/incident-report/repositories/incident-report.repository';
import { IncidentReportId } from '@/domain/incident-report/value-objects/incident-report-id.vo';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import {
  Prisma,
  type incident_reports as IncidentReportRow,
} from '@/infrastructure/persistence/prisma/generated/client';

@Injectable()
export class PrismaIncidentReportRepository
  implements IncidentReportRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async save(report: IncidentReport): Promise<string> {
    const id = report.getId()?.toString();

    const data = {
      title: report.getTitle(),
      description: report.getDescription(),
      attachment_urls: report.getAttachmentUrls(),
      updated_at: report.getUpdatedAt(),
    };

    if (id) {
      await this.prisma.incident_reports.update({ where: { id }, data });
      return id;
    }

    const created = await this.prisma.incident_reports.create({
      data: {
        ...data,
        tenant_id: report.getTenantId(),
        property_id: report.getPropertyId(),
        created_by: report.getCreatedBy(),
        created_at: report.getCreatedAt(),
      },
    });
    return created.id;
  }

  async findById(id: IncidentReportId): Promise<IncidentReport | null> {
    const row = await this.prisma.incident_reports.findFirst({
      where: { id: id.toString(), deleted_at: null },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByPropertyId(
    tenantId: string,
    propertyId: string,
  ): Promise<IncidentReport[]> {
    return this.findMany({
      tenant_id: tenantId,
      property_id: propertyId,
      deleted_at: null,
    });
  }

  async findByCreatedBy(
    tenantId: string,
    createdBy: string,
  ): Promise<IncidentReport[]> {
    return this.findMany({
      tenant_id: tenantId,
      created_by: createdBy,
      deleted_at: null,
    });
  }

  async delete(id: IncidentReportId): Promise<void> {
    await this.prisma.incident_reports.update({
      where: { id: id.toString() },
      data: { deleted_at: new Date() },
    });
  }

  private async findMany(
    where: Prisma.incident_reportsWhereInput,
  ): Promise<IncidentReport[]> {
    const rows = await this.prisma.incident_reports.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: IncidentReportRow): IncidentReport {
    return IncidentReport.reconstitute({
      id: IncidentReportId.create(row.id),
      tenantId: row.tenant_id,
      propertyId: row.property_id,
      createdBy: row.created_by,
      title: row.title,
      description: row.description,
      attachmentUrls: row.attachment_urls,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
