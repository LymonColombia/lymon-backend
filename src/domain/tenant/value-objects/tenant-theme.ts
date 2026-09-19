/**
 * Branding color palette for a tenant. All variables are optional hex strings;
 * absent variables fall back to the frontend defaults.
 */
export interface TenantTheme {
  primary?: string | null;
  secondary?: string | null;
  accent?: string | null;
}
