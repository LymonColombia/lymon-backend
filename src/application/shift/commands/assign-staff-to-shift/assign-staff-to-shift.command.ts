export class AssignStaffToShiftCommand {
  constructor(
    readonly shiftId: string,
    readonly tenantId: string,
    readonly staffMemberIds: string[],
    readonly actorId: string,
    readonly actorEmail: string,
  ) {}
}
