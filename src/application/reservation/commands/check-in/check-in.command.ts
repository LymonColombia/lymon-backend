import { TravelerInfo } from '@/domain/reservation/entities/reservation.entity';

export class CheckInCommand {
  constructor(
    public readonly reservationId: string,
    public readonly tenantId: string,
    public readonly actualAt: Date | null,
    public readonly actorId: string,
    public readonly actorEmail: string,
    public readonly travelers?: TravelerInfo[],
  ) {}
}
