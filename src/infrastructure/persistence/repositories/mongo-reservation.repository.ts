
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import type {
  GuestReservationFilters,
  GuestReservationQueryOptions,
  GuestReservationsReadRepository,
} from '@/domain/reservation/repositories/guest-reservations-read.repository';
import type { ReservationRepository } from '@/domain/reservation/repositories/reservation.repository';
import { Reservation } from '@/domain/reservation/entities/reservation.entity';
import { ReservationId } from '@/domain/reservation/value-objects/reservation-id.vo';
import { DateRange } from '@/domain/reservation/value-objects/date-range.vo';
import {
  ReservationSource,
  ReservationSourceEnum,
} from '@/domain/reservation/value-objects/reservation-source.vo';
import {
  ReservationStatus,
  ReservationStatusEnum,
} from '@/domain/reservation/value-objects/reservation-status.vo';
import { ReservationDocument } from '../schemas/reservation.schema';
import { CounterDocument } from '../schemas/counter.schema';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TransactionContextData } from '@/domain/shared/transaction-manager.interface';
import { GuestLifecycleStatus } from '@/domain/guest/value-objects/guest-lifecycle-status.vo';

const ACTIVE_RESERVATION_STATUSES = [
  ReservationStatusEnum.PENDING,
  ReservationStatusEnum.CONFIRMED,
  ReservationStatusEnum.CHECKED_IN,
];

@Injectable()
export class MongoReservationRepository
  implements ReservationRepository, GuestReservationsReadRepository
{
  constructor(
    @InjectModel(ReservationDocument.name)
    private readonly reservationModel: Model<ReservationDocument>,
    @InjectModel(CounterDocument.name)
    private readonly counterModel: Model<CounterDocument>,
  ) {}

  async save(
    reservation: Reservation,
    ctx?: TransactionContextData,
  ): Promise<string> {
    const session = ctx as ClientSession | undefined;
    const id = reservation.getId()?.toString();

    const tenantIdStr = reservation.getTenantId().toString();

    const document = {
      tenantId: new Types.ObjectId(tenantIdStr),
      propertyId: new Types.ObjectId(reservation.getPropertyId().toString()),
      unitId: new Types.ObjectId(reservation.getUnitId().toString()),
      guestId: new Types.ObjectId(reservation.getGuestId().toString()),
      checkIn: reservation.getDateRange().getCheckIn(),
      checkOut: reservation.getDateRange().getCheckOut(),
      source: reservation.getSource().toString(),
      status: reservation.getStatus().toString(),
      guestsCount: reservation.getGuestsCount(),
      pricePerNight: reservation.getPricePerNight(),
      totalPrice: reservation.getTotalPrice(),
      notes: reservation.getNotes(),
      ...(reservation.getExternalReservationId()
        ? { externalReservationId: reservation.getExternalReservationId() }
        : {}),
      cancelledAt: reservation.getCancelledAt(),
      cancellationReason: reservation.getCancellationReason(),
      checkInActualAt: reservation.getCheckInActualAt(),
      checkOutActualAt: reservation.getCheckOutActualAt(),
      checkInInfo: reservation.getCheckInInfo(),
      updatedAt: reservation.getUpdatedAt(),
    };

    if (id) {
      await this.reservationModel.findByIdAndUpdate(id, document, {
        new: true,
        session,
      });
      return id;
    }

    const reservationNumber = await this.getNextReservationNumber(tenantIdStr);

    const newDoc = new this.reservationModel({
      ...document,
      reservationNumber,
      createdAt: reservation.getCreatedAt(),
    });
    const saved = session
      ? await newDoc.save({ session })
      : await newDoc.save();

    reservation.setReservationNumber(reservationNumber);

    return saved._id.toHexString();
  }

  private async getNextReservationNumber(tenantId: string): Promise<number> {
    const counter = await this.counterModel.findOneAndUpdate(
      { _id: `reservation:${tenantId}` },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' },
    );
    return counter!.seq;
  }

  async findById(id: ReservationId): Promise<Reservation | null> {
    const doc = await this.reservationModel.findById(id.toString());
    if (!doc) return null;
    return this.toDomain(doc);
  }

  async findByTenantId(
    tenantId: string,
    page: number,
    limit: number,
  ): Promise<Reservation[]> {
    const skip = (page - 1) * limit;
    const docs = await this.reservationModel
      .find({ tenantId: new Types.ObjectId(tenantId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    return docs.map((d) => this.toDomain(d));
  }

  async findByPropertyId(
    tenantId: string,
    propertyId: string,
    page: number,
    limit: number,
  ): Promise<Reservation[]> {
    const skip = (page - 1) * limit;
    const docs = await this.reservationModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        propertyId: new Types.ObjectId(propertyId),
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    return docs.map((d) => this.toDomain(d));
  }

  async findByUnitId(
    tenantId: string,
    unitId: string,
    page: number,
    limit: number,
  ): Promise<Reservation[]> {
    const skip = (page - 1) * limit;
    const docs = await this.reservationModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        unitId: new Types.ObjectId(unitId),
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    return docs.map((d) => this.toDomain(d));
  }

  async findByGuestId(
    tenantId: string,
    guestId: string,
    page: number,
    limit: number,
    sortBy: 'checkIn' | 'createdAt' = 'createdAt',
    sortDirection: 'asc' | 'desc' = 'desc',
  ): Promise<Reservation[]> {
    const skip = (page - 1) * limit;
    const sortField = sortBy === 'checkIn' ? 'checkIn' : 'createdAt';
    const sortOrder = sortDirection === 'asc' ? 1 : -1;
    const docs = await this.reservationModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        guestId: new Types.ObjectId(guestId),
      })
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit);
    return docs.map((d) => this.toDomain(d));
  }

  async countByGuestId(tenantId: string, guestId: string): Promise<number> {
    return this.reservationModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      guestId: new Types.ObjectId(guestId),
    });
  }

  async countByGuestIdGroupedBySource(
    tenantId: string,
    guestId: string,
  ): Promise<Array<{ source: string; count: number }>> {
    const result = await this.reservationModel.aggregate<{
      _id: string;
      count: number;
    }>([
      {
        $match: {
          tenantId: new Types.ObjectId(tenantId),
          guestId: new Types.ObjectId(guestId),
        },
      },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return result.map((r) => ({ source: r._id, count: r.count }));
  }

  async findByGuestIds(
    guestIds: string[],
    options: GuestReservationQueryOptions,
  ): Promise<Reservation[]> {
    if (guestIds.length === 0) {
      return [];
    }

    const skip = (options.page - 1) * options.limit;
    let sortField: 'status' | 'createdAt' | 'checkIn' = 'checkIn';
    if (options.sortBy === 'status') {
      sortField = 'status';
    }
    if (options.sortBy === 'createdAt') {
      sortField = 'createdAt';
    }
    const sortDirection = options.sortOrder === 'asc' ? 1 : -1;

    const guestObjectIds = guestIds.map(
      (guestId) => new Types.ObjectId(guestId),
    );
    const filters = this.buildGuestFilters(guestObjectIds, options);

    const docs = await this.reservationModel
      .find(filters)
      .sort({ [sortField]: sortDirection, createdAt: -1 })
      .skip(skip)
      .limit(options.limit);

    return docs.map((d) => this.toDomain(d));
  }

  async countByGuestIds(
    guestIds: string[],
    filters?: GuestReservationFilters,
  ): Promise<number> {
    if (guestIds.length === 0) {
      return 0;
    }

    const guestObjectIds = guestIds.map(
      (guestId) => new Types.ObjectId(guestId),
    );
    return this.reservationModel.countDocuments(
      this.buildGuestFilters(guestObjectIds, filters),
    );
  }

  async findByUnitAndDateRange(
    unitId: UnitId,
    dateRange: DateRange,
  ): Promise<Reservation[]> {
    const docs = await this.reservationModel.find({
      unitId: new Types.ObjectId(unitId.toString()),
      checkIn: { $lt: dateRange.getCheckOut() },
      checkOut: { $gt: dateRange.getCheckIn() },
    });
    return docs.map((d) => this.toDomain(d));
  }

  async findActiveByUnitFromDate(
    unitId: UnitId,
    fromDate: Date,
  ): Promise<Reservation[]> {
    const docs = await this.reservationModel.find({
      unitId: new Types.ObjectId(unitId.toString()),
      status: {
        $nin: [
          ReservationStatusEnum.CANCELLED,
          ReservationStatusEnum.NO_SHOW,
          ReservationStatusEnum.CHECKED_OUT,
        ],
      },
      checkOut: { $gt: fromDate },
    });

    return docs.map((d) => this.toDomain(d));
  }

  async findByExternalId(
    source: ReservationSourceEnum,
    externalId: string,
  ): Promise<Reservation | null> {
    const doc = await this.reservationModel.findOne({
      source,
      externalReservationId: externalId,
    });
    if (!doc) return null;
    return this.toDomain(doc);
  }

  async existsActiveByPropertyId(
    tenantId: string,
    propertyId: string,
  ): Promise<boolean> {
    const count = await this.reservationModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      propertyId: new Types.ObjectId(propertyId),
      status: { $in: ACTIVE_RESERVATION_STATUSES },
    });

    return count > 0;
  }

  async existsActiveByUnitId(
    tenantId: string,
    unitId: string,
  ): Promise<boolean> {
    const count = await this.reservationModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      unitId: new Types.ObjectId(unitId),
      status: { $in: ACTIVE_RESERVATION_STATUSES },
    });

    return count > 0;
  }

  async countByTenantId(tenantId: string): Promise<number> {
    return this.reservationModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
    });
  }

  async findConfirmedDueForCheckIn(date: Date): Promise<Reservation[]> {
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const docs = await this.reservationModel.find({
      status: ReservationStatusEnum.CONFIRMED,
      checkIn: { $lte: endOfDay },
    });
    return docs.map((d) => this.toDomain(d));
  }

  async getMonthlySpendingByGuestId(
    tenantId: string,
    guestId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<{ year: number; month: number; totalSpend: number }[]> {
    return this.reservationModel.aggregate([
      {
        $match: {
          tenantId: new Types.ObjectId(tenantId),
          guestId: new Types.ObjectId(guestId),
          checkIn: { $gte: fromDate, $lte: toDate },
          status: {
            $in: [
              ReservationStatusEnum.CONFIRMED,
              ReservationStatusEnum.CHECKED_IN,
              ReservationStatusEnum.CHECKED_OUT,
            ],
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$checkIn' },
            month: { $month: '$checkIn' },
          },
          totalSpend: { $sum: '$totalPrice' },
        },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          totalSpend: 1,
        },
      },
      { $sort: { year: 1, month: 1 } },
    ]);
  }
  async getLifecycleStatusByGuestIds(
  guestIds: string[],
): Promise<Map<string, GuestLifecycleStatus>> {
  if (guestIds.length === 0) {
    return new Map();
  }

  const guestObjectIds = guestIds.map((id) => new Types.ObjectId(id));

  const results = await this.reservationModel.aggregate([
    {
      $match: {
        guestId: { $in: guestObjectIds },
      },
    },
    {
      $group: {
        _id: '$guestId',
        statuses: { $push: '$status' },
      },
    },
  ]);

  const statusMap = new Map<string, GuestLifecycleStatus>();

  results.forEach((res) => {
    const guestId = res._id.toHexString(); // ObjectId → string
    const guestStatuses: string[] = res.statuses;

    let finalStatus = GuestLifecycleStatus.NO_RESERVATION;

    if (guestStatuses.includes(ReservationStatusEnum.CHECKED_IN)) {
      finalStatus = GuestLifecycleStatus.CHECKED_IN;
    } else if (guestStatuses.includes(ReservationStatusEnum.CONFIRMED)) {
      finalStatus = GuestLifecycleStatus.UPCOMING_STAY;
    } else if (guestStatuses.includes(ReservationStatusEnum.CHECKED_OUT)) {
      finalStatus = GuestLifecycleStatus.PAST_GUEST;
    }

    statusMap.set(guestId, finalStatus);
  });

  return statusMap;
}


  private buildGuestFilters(
    guestIds: Types.ObjectId[],
    filters?: GuestReservationFilters,
  ): Record<string, unknown> {
    const query: Record<string, unknown> = {
      guestId: { $in: guestIds },
    };

    if (filters?.statuses && filters.statuses.length > 0) {
      query.status = { $in: filters.statuses };
    }

    if (filters?.fromDate || filters?.toDate) {
      const checkInFilter: Record<string, Date> = {};

      if (filters.fromDate) {
        checkInFilter.$gte = filters.fromDate;
      }

      if (filters.toDate) {
        checkInFilter.$lte = filters.toDate;
      }

      query.checkIn = checkInFilter;
    }

    return query;
  }

  private toDomain(doc: ReservationDocument): Reservation {
    return Reservation.reconstitute({
      id: doc._id.toHexString(),
      tenantId: TenantId.createFromString(doc.tenantId.toHexString()),
      propertyId: PropertyId.create(doc.propertyId.toHexString()),
      unitId: UnitId.create(doc.unitId.toHexString()),
      guestId: GuestId.createFromString(doc.guestId.toHexString()),
      dateRange: DateRange.reconstitute(doc.checkIn, doc.checkOut),
      source: ReservationSource.create(doc.source as ReservationSourceEnum),
      status: ReservationStatus.create(doc.status as ReservationStatusEnum),
      guestsCount: doc.guestsCount,
      pricePerNight: doc.pricePerNight,
      totalPrice: doc.totalPrice,
      notes: doc.notes,
      externalReservationId: doc.externalReservationId ?? null,
      cancelledAt: doc.cancelledAt,
      cancellationReason: doc.cancellationReason,
      checkInActualAt: doc.checkInActualAt,
      checkOutActualAt: doc.checkOutActualAt,
      reservationNumber: doc.reservationNumber ?? 0,
      checkInInfo: (doc.checkInInfo ?? []).map((t) => ({
        fullName: t.fullName,
        documentType: t.documentType,
        documentNumber: t.documentNumber,
        nationality: t.nationality,
        dateOfBirth: t.dateOfBirth ?? null,
        phone: t.phone ?? null,
      })),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  async getLastStayAt(tenantId: string, guestId: string): Promise<Date | null> {
    const result = await this.reservationModel.aggregate<{
      lastStayAt: Date | null;
    }>([
      {
        $match: {
          tenantId: new Types.ObjectId(tenantId),
          guestId: new Types.ObjectId(guestId),
          status: ReservationStatusEnum.CHECKED_OUT,
        },
      },
      {
        $group: {
          _id: null,
          // Actual checkout when recorded, otherwise the scheduled one.
          lastStayAt: { $max: { $ifNull: ['$checkOutActualAt', '$checkOut'] } },
        },
      },
    ]);

    return result[0]?.lastStayAt ?? null;
  }
}
