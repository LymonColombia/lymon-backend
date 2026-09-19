import { IQuery } from '@nestjs/cqrs';

export class GetExperienceReservedDatesQuery implements IQuery {
  constructor(
    public readonly experienceId: string,
    public readonly dateFrom?: Date,
    public readonly dateTo?: Date,
  ) {}
}
