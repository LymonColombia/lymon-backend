export class AssignStaffToShiftCommandResult {
  constructor(
    readonly shiftId: string,
    readonly assignedStaffMemberIds: string[],
  ) {}
}
