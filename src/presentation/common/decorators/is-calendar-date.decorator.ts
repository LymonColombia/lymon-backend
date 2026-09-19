import { applyDecorators } from '@nestjs/common';
import { IsDateString, Matches, ValidationOptions } from 'class-validator';

/**
 * Calendar date with no time component (YYYY-MM-DD).
 * Rejects full ISO timestamps so client-local times can never
 * shift the date across midnight UTC (LYMON-1092).
 */
export function IsCalendarDate(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsDateString({ strict: true }, validationOptions),
    Matches(/^\d{4}-\d{2}-\d{2}$/, {
      message: '$property must be a calendar date in YYYY-MM-DD format',
      ...validationOptions,
    }),
  );
}
