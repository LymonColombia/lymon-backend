export class UnassignStaffFromShiftCommandResult {
  constructor(
    readonly shiftId: string,
    readonly remainingStaffMemberIds: string[],
  ) {}
}
