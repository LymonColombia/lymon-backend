export class CancellationRefundService {
  static calculate(
    checkIn: Date,
    cancellationDate: Date,
    totalPrice: number,
  ): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    const checkInNormalized = new Date(
      checkIn.getFullYear(),
      checkIn.getMonth(),
      checkIn.getDate(),
    );
    const cancelNormalized = new Date(
      cancellationDate.getFullYear(),
      cancellationDate.getMonth(),
      cancellationDate.getDate(),
    );
    const daysUntilCheckIn = Math.floor(
      (checkInNormalized.getTime() - cancelNormalized.getTime()) / msPerDay,
    );

    if (daysUntilCheckIn >= 5) {
      return totalPrice;
    }

    return 0;
  }
}
