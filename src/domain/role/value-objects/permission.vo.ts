/**
 * All granular permissions in the system, organized by domain.
 * Format: DOMAIN_ACTION
 */
export enum Permission {
  // --- Tenant ---
  TENANT_SETTINGS_VIEW = 'TENANT_SETTINGS_VIEW',
  TENANT_SETTINGS_EDIT = 'TENANT_SETTINGS_EDIT',
  TENANT_BILLING_VIEW = 'TENANT_BILLING_VIEW',
  TENANT_USERS_MANAGE = 'TENANT_USERS_MANAGE',

  // --- Property ---
  PROPERTY_VIEW = 'PROPERTY_VIEW',
  PROPERTY_CREATE = 'PROPERTY_CREATE',
  PROPERTY_EDIT = 'PROPERTY_EDIT',
  PROPERTY_DELETE = 'PROPERTY_DELETE',

  // --- Unit ---
  UNIT_VIEW = 'UNIT_VIEW',
  UNIT_CREATE = 'UNIT_CREATE',
  UNIT_EDIT = 'UNIT_EDIT',
  UNIT_DELETE = 'UNIT_DELETE',

  // --- Experience ---
  EXPERIENCE_DELETE = 'EXPERIENCE_DELETE',

  // --- Reservations ---
  RESERVATION_VIEW = 'RESERVATION_VIEW',
  RESERVATION_CREATE = 'RESERVATION_CREATE',
  RESERVATION_EDIT = 'RESERVATION_EDIT',
  RESERVATION_DELETE = 'RESERVATION_DELETE',

  // --- Finances ---
  FINANCE_VIEW = 'FINANCE_VIEW',
  FINANCE_CREATE = 'FINANCE_CREATE',
  FINANCE_EDIT = 'FINANCE_EDIT',

  // --- CRM ---
  CRM_VIEW = 'CRM_VIEW',
  CRM_MANAGE = 'CRM_MANAGE',

  // --- Integrations ---
  INTEGRATION_VIEW = 'INTEGRATION_VIEW',
  INTEGRATION_MANAGE = 'INTEGRATION_MANAGE',

  // --- Audit ---
  AUDIT_VIEW = 'AUDIT_VIEW',

  // --- Experience ---
  EXPERIENCE_EDIT = 'EXPERIENCE_EDIT',

  // --- Incident Reports ---
  INCIDENT_REPORT_CREATE = 'INCIDENT_REPORT_CREATE',
  INCIDENT_REPORT_READ = 'INCIDENT_REPORT_READ',
  INCIDENT_REPORT_EDIT = 'INCIDENT_REPORT_EDIT',
  INCIDENT_REPORT_DELETE = 'INCIDENT_REPORT_DELETE',
}

/** All permissions — assigned to OWNER */
export const ALL_PERMISSIONS: Permission[] = Object.values(Permission);

/** Permissions for the built-in ADMIN system role */
export const ADMIN_PERMISSIONS: Permission[] = [
  Permission.PROPERTY_VIEW,
  Permission.PROPERTY_CREATE,
  Permission.PROPERTY_EDIT,
  Permission.UNIT_VIEW,
  Permission.UNIT_CREATE,
  Permission.UNIT_EDIT,
  Permission.RESERVATION_VIEW,
  Permission.RESERVATION_CREATE,
  Permission.RESERVATION_EDIT,
  Permission.FINANCE_VIEW,
  Permission.FINANCE_CREATE,
  Permission.FINANCE_EDIT,
  Permission.CRM_VIEW,
  Permission.CRM_MANAGE,
  Permission.INTEGRATION_VIEW,
  Permission.TENANT_USERS_MANAGE,
  Permission.AUDIT_VIEW,
  Permission.EXPERIENCE_EDIT,
  Permission.INCIDENT_REPORT_CREATE,
  Permission.INCIDENT_REPORT_READ,
  Permission.INCIDENT_REPORT_EDIT,
  Permission.INCIDENT_REPORT_DELETE,
];

/** Permissions for the built-in STAFF system role */
export const STAFF_PERMISSIONS: Permission[] = [
  Permission.PROPERTY_VIEW,
  Permission.UNIT_VIEW,
  Permission.RESERVATION_VIEW,
  Permission.RESERVATION_CREATE,
  Permission.RESERVATION_EDIT,
  Permission.RESERVATION_DELETE,
  Permission.INCIDENT_REPORT_CREATE,
  Permission.INCIDENT_REPORT_READ,
  Permission.INCIDENT_REPORT_EDIT,
  Permission.INCIDENT_REPORT_DELETE,
];
