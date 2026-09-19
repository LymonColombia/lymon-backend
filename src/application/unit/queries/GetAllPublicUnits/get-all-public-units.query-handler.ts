import { Inject } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetAllPublicUnitsQuery } from './get-all-public-units.query';
import { GetAllPublicUnitsResult } from './get-all-public-units.result';
import { UNIT_REPOSITORY } from '@/domain/unit/repositories/unit.repository';
import type { UnitRepository } from '@/domain/unit/repositories/unit.repository';
import { Unit } from '@/domain/unit/entities/unit.entity';
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

@QueryHandler(GetAllPublicUnitsQuery)
export class GetAllPublicUnitsQueryHandler implements IQueryHandler<
  GetAllPublicUnitsQuery,
  GetAllPublicUnitsResult
> {
  constructor(
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepository: UnitRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
    @Inject(R2_STORAGE_SERVICE)
    private readonly storage: R2StorageService,
  ) {}

  async execute(
    query: GetAllPublicUnitsQuery,
  ): Promise<GetAllPublicUnitsResult> {
    // Si hay fechas, necesitamos filtrar por disponibilidad
    if (query.startDate && query.endDate) {
      const dateRange = DateRange.create(query.startDate, query.endDate);

      // Obtenemos todas las unidades candidatas (sin paginar en DB para poder filtrar luego)
      const { units } = await this.unitRepository.findAllPaginated(
        1,
        1000, // Un límite razonable para filtrado en memoria
        query.minGuests,
        query.propertyId,
        undefined,
        query.name,
      );

      const availableUnits: Unit[] = [];
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

      if (query.sortByPrice) {
        availableUnits.sort((a, b) =>
          query.sortByPrice === 'asc'
            ? a.getPricePerNight() - b.getPricePerNight()
            : b.getPricePerNight() - a.getPricePerNight(),
        );
      }

      const total = availableUnits.length;
      const skip = (query.page - 1) * query.limit;
      const paginatedUnits = availableUnits.slice(skip, skip + query.limit);
      const dtos = paginatedUnits.map((u) => mapUnitToPublicDto(u, (k) => this.storage.getPublicUrl(k)));

      return new GetAllPublicUnitsResult(dtos, total, query.page, query.limit);
    }

    // Si no hay fechas, usamos la paginación estándar de DB
    const { units, total } = await this.unitRepository.findAllPaginated(
      query.page,
      query.limit,
      query.minGuests,
      query.propertyId,
      query.sortByPrice,
      query.name,
    );
    const dtos = units.map((u) => mapUnitToPublicDto(u, (k) => this.storage.getPublicUrl(k)));

    return new GetAllPublicUnitsResult(dtos, total, query.page, query.limit);
  }
}
