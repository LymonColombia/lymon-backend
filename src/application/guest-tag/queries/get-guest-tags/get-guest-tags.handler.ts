import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetGuestTagsQuery } from './get-guest-tags.query';
import { GetGuestTagsResult, GuestTagDto } from './get-guest-tags.result';
import {
  GUEST_TAG_REPOSITORY,
  type GuestTagRepository,
} from '@/domain/guest-tag/repositories/guest-tag.repository';

@QueryHandler(GetGuestTagsQuery)
export class GetGuestTagsHandler implements IQueryHandler<
  GetGuestTagsQuery,
  GetGuestTagsResult
> {
  constructor(
    @Inject(GUEST_TAG_REPOSITORY)
    private readonly guestTagRepository: GuestTagRepository,
  ) {}

  async execute(query: GetGuestTagsQuery): Promise<GetGuestTagsResult> {
    const tags = await this.guestTagRepository.findAll(query.tenantId);
    return new GetGuestTagsResult(
      tags.map((t) => new GuestTagDto(t.getId()!.toString(), t.getName())),
    );
  }
}
