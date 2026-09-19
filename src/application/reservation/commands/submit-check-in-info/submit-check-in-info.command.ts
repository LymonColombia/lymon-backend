export class SubmitCheckInInfoCommand {
  constructor(
    public readonly reservationId: string,
    public readonly guestAccountId: string,
    public readonly travelers: Array<{
      fullName: string;
      documentType: string;
      documentNumber: string;
      nationality: string;
      dateOfBirth: Date | null;
      phone: string | null;
    }>,
  ) {}
}
