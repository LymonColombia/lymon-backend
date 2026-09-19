import { MediaCategory } from '@/application/storage/media-category.enum';

/**
 * R2 prefix a tenant's logo lives under. Mirrors the key layout of the generic
 * storage presigned endpoint: `${tenantId}/${category}/...`.
 */
export function tenantLogoPrefix(tenantId: string): string {
  return `${tenantId}/${MediaCategory.Logos}/`;
}
