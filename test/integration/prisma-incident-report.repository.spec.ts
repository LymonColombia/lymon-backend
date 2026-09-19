import { PrismaIncidentReportRepository } from '@/infrastructure/persistence/repositories/prisma-incident-report.repository';
import { IncidentReport } from '@/domain/incident-report/entities/incident-report.entity';
import { IncidentReportId } from '@/domain/incident-report/value-objects/incident-report-id.vo';
import { prisma, resetDatabase } from './prisma.helper';
import { seedProperty, seedTenant, seedUser } from './fixtures';

describe('PrismaIncidentReportRepository', () => {
  const repo = new PrismaIncidentReportRepository(prisma);

  let tenantId: string;
  let propertyId: string;
  let userId: string;

  beforeEach(async () => {
    await resetDatabase();
    tenantId = (await seedTenant()).id;
    propertyId = (await seedProperty(tenantId)).id;
    userId = (await seedUser(tenantId)).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const newReport = (title = 'Broken window') =>
    IncidentReport.create(tenantId, propertyId, userId, title, 'In room 101', [
      'incidents/a.jpg',
      'incidents/b.jpg',
    ]);

  it('round-trips the attachment array', async () => {
    const id = await repo.save(newReport());

    const found = (await repo.findById(IncidentReportId.create(id)))!;
    expect(found.getTitle()).toBe('Broken window');
    expect(found.getAttachmentUrls()).toEqual([
      'incidents/a.jpg',
      'incidents/b.jpg',
    ]);
    expect(found.getCreatedBy()).toBe(userId);
  });

  it('updates in place', async () => {
    const id = await repo.save(newReport());
    const found = (await repo.findById(IncidentReportId.create(id)))!;

    found.update('Fixed window', 'Replaced the glass');
    expect(await repo.save(found)).toBe(id);

    expect(await prisma.incident_reports.count()).toBe(1);
    expect((await repo.findById(IncidentReportId.create(id)))!.getTitle()).toBe(
      'Fixed window',
    );
  });

  it('lists by property and author, and hides soft-deleted reports', async () => {
    const id = await repo.save(newReport());

    expect(await repo.findByPropertyId(tenantId, propertyId)).toHaveLength(1);
    expect(await repo.findByCreatedBy(tenantId, userId)).toHaveLength(1);

    await repo.delete(IncidentReportId.create(id));

    expect(await repo.findById(IncidentReportId.create(id))).toBeNull();
    expect(await repo.findByPropertyId(tenantId, propertyId)).toEqual([]);
    expect(await repo.findByCreatedBy(tenantId, userId)).toEqual([]);
  });
});
