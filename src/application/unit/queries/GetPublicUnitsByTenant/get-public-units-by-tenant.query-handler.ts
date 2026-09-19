import { Inject, NotFoundException } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetPublicUnitsByTenantQuery } from './get-public-units-by-tenant.query';
import { GetPublicUnitsByTenantResult } from './get-public-units-by-tenant.result';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { TENANT_REPOSITORY } from '@/domain/tenant/repositories/tenant.repository';
import type { TenantRepository } from '@/domain/tenant/repositories/tenant.repository';
import { UNIT_REPOSITORY } from '@/domain/unit/repositories/unit.repository';
import type { UnitRepository } from '@/domain/unit/repositories/unit.repository';
import { mapUnitToPublicDto } from '@/application/reservation/queries/shared/unit.mapper';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '@/domain/reservation/repositories/reservation.repository';
import { AvailabilityChecker } from '@/domain/reservation/services/availability-checker.domain-service';
import { DateRange } from '@/domain/reservation/value-objects/date-range.vo';
import {
  R2StorageService,
  R2_STORAGE_SERVICE,
} from '@/infrastructure/storage/r2-storage.service';

@QueryHandler(GetPublicUnitsByTenantQuery)
export class GetPublicUnitsByTenantQueryHandler implements IQueryHandler<
  GetPublicUnitsByTenantQuery,
  GetPublicUnitsByTenantResult
> {
  constructor(
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepository: UnitRepository,
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: TenantRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
    @Inject(R2_STORAGE_SERVICE)
    private readonly storage: R2StorageService,
  ) {}

  async execute(
    query: GetPublicUnitsByTenantQuery,
  ): Promise<GetPublicUnitsByTenantResult> {
    const tenant = await this.tenantRepository.findBySlug(query.tenantSlug);
    if (!tenant) throw new NotFoundException('Tenant not found');

    const tenantId = TenantId.createFromString(tenant.getId()!.toString());

    // Si hay fechas, necesitamos filtrar por disponibilidad
    if (query.startDate && query.endDate) {
      const dateRange = DateRange.create(query.startDate, query.endDate);

      // Obtenemos todas las unidades candidatas del tenant (sin paginar en DB para filtrar luego)
      const { units } = await this.unitRepository.findByTenantIdPaginated(
        tenantId,
        1,
        1000,
        query.minGuests,
      );

      const availableUnits: any[] = [];
      for (const unit of units) {
        const reservations =
          await this.reservationRepository.findByUnitAndDateRange(
            unit.getId()!,
            dateRange,
          );

        const isAvailable = AvailabilityChecker.isAvailable(
          dateRange,
          reservations,
          unit.getInventoryCount(),
        );

        if (isAvailable) {
          availableUnits.push(unit);
        }
      }

      const total = availableUnits.length;
      const skip = (query.page - 1) * query.limit;
      const paginatedUnits = availableUnits.slice(skip, skip + query.limit);
      const dtos = paginatedUnits.map((u) =>
        mapUnitToPublicDto(u, (k) => this.storage.getPublicUrl(k)),
      );

      return new GetPublicUnitsByTenantResult(
        dtos,
        total,
        query.page,
        query.limit,
      );
    }

    const { units, total } = await this.unitRepository.findByTenantIdPaginated(
      tenantId,
      query.page,
      query.limit,
      query.minGuests,
    );
    const dtos = units.map((u) =>
      mapUnitToPublicDto(u, (k) => this.storage.getPublicUrl(k)),
    );

    return new GetPublicUnitsByTenantResult(
      dtos,
      total,
      query.page,
      query.limit,
    );
  }
}
