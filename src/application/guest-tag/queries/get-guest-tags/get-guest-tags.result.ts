export class GuestTagDto {
  constructor(
    public readonly id: string,
    public readonly name: string,
  ) {}
}

export class GetGuestTagsResult {
  constructor(public readonly tags: GuestTagDto[]) {}
}
