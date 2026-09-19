/** Allowed image content types mapped to the extension used in the R2 key. */
export const PROFILE_PHOTO_EXT_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Dedicated R2 prefix a guest's profile photos live under. */
export function guestProfilePhotoPrefix(guestAccountId: string): string {
  return `guests/${guestAccountId}/profile/`;
}
