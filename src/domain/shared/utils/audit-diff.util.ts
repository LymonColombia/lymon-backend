export type AuditDiffResult = {
  changedFields: string[];
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
};

export function buildAuditDiff(
  previousSnapshot: Record<string, unknown>,
  nextSnapshot: Record<string, unknown>,
): AuditDiffResult {
  const changedFields: string[] = [];
  const previousValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};

  for (const field of Object.keys(nextSnapshot)) {
    const previousFieldValue = previousSnapshot[field];
    const nextFieldValue = nextSnapshot[field];

    if (previousFieldValue === nextFieldValue) {
      continue;
    }

    changedFields.push(field);
    previousValue[field] = previousFieldValue;
    newValue[field] = nextFieldValue;
  }

  return {
    changedFields,
    previousValue: changedFields.length > 0 ? previousValue : undefined,
    newValue: changedFields.length > 0 ? newValue : undefined,
  };
}
