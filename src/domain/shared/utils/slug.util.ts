export function createSlug(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'item';
}

/**
 * Builds a slug as `<name-slug>-<suffix of id>`, starting with a 4-char id
 * suffix and progressively widening it (in 2-char steps, up to the full id)
 * until `isTaken` reports the candidate as free.
 */
export async function generateUniqueSlug(
  name: string,
  id: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = createSlug(name);

  for (let suffixLength = 4; suffixLength < id.length; suffixLength += 2) {
    const candidate = `${base}-${id.slice(-suffixLength)}`;
    if (!(await isTaken(candidate))) {
      return candidate;
    }
  }

  return `${base}-${id}`;
}
