/**
 * Permission system for NF CRM
 *
 * Permissions are stored as string arrays on User.permissions
 * SUPER_ADMIN has all permissions by default
 * ADMIN has most permissions by default (except system-critical ones)
 */

// All available permissions in the system
export const PERMISSIONS = {
  // Dashboard & General
  DASHBOARD: "dashboard",

  // Members
  VIEW_MEMBERS: "view_members",
  EDIT_MEMBERS: "edit_members",
  DELETE_MEMBERS: "delete_members",

  // Leads
  VIEW_LEADS: "view_leads",
  EDIT_LEADS: "edit_leads",
  DELETE_LEADS: "delete_leads",

  // KPIs
  VIEW_KPIS: "view_kpis",
  MANAGE_KPIS: "manage_kpis",

  // Tasks
  VIEW_TASKS: "tasks",
  MANAGE_TASKS: "manage_tasks",

  // Automations
  VIEW_AUTOMATIONS: "view_automations",
  MANAGE_AUTOMATIONS: "manage_automations",

  // Settings
  VIEW_SETTINGS: "view_settings",
  MANAGE_SETTINGS: "manage_settings",

  // Team
  VIEW_TEAM: "view_team",
  MANAGE_TEAM: "manage_team",

  // System
  SYSTEM_ADMIN: "system_admin",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Default permissions by role
export const DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS), // All permissions
  ADMIN: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.VIEW_MEMBERS,
    PERMISSIONS.EDIT_MEMBERS,
    PERMISSIONS.DELETE_MEMBERS,
    PERMISSIONS.VIEW_LEADS,
    PERMISSIONS.EDIT_LEADS,
    PERMISSIONS.DELETE_LEADS,
    PERMISSIONS.VIEW_KPIS,
    PERMISSIONS.MANAGE_KPIS,
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.MANAGE_TASKS,
    PERMISSIONS.VIEW_AUTOMATIONS,
    PERMISSIONS.MANAGE_AUTOMATIONS,
    PERMISSIONS.VIEW_SETTINGS,
    PERMISSIONS.VIEW_TEAM,
  ],
  COACH: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.VIEW_MEMBERS,
    PERMISSIONS.VIEW_LEADS,
    PERMISSIONS.VIEW_KPIS,
    PERMISSIONS.VIEW_TASKS,
  ],
};

interface UserWithPermissions {
  role?: string;
  permissions?: string[];
}

/**
 * Check if a user has a specific permission
 * SUPER_ADMIN always has all permissions
 * Otherwise checks user's role default permissions + explicit permissions
 */
export function hasPermission(
  user: UserWithPermissions | null | undefined,
  permission: Permission
): boolean {
  if (!user) return false;

  // SUPER_ADMIN has all permissions
  if (user.role === "SUPER_ADMIN") return true;

  // Check explicit permissions first
  if (user.permissions?.includes(permission)) return true;

  // Check role default permissions
  const rolePermissions = DEFAULT_PERMISSIONS[user.role || ""] || [];
  return rolePermissions.includes(permission);
}

/**
 * Check if user has any of the given permissions
 */
export function hasAnyPermission(
  user: UserWithPermissions | null | undefined,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(user, p));
}

/**
 * Check if user has all of the given permissions
 */
export function hasAllPermissions(
  user: UserWithPermissions | null | undefined,
  permissions: Permission[]
): boolean {
  return permissions.every((p) => hasPermission(user, p));
}

/**
 * Get all effective permissions for a user
 */
export function getEffectivePermissions(
  user: UserWithPermissions | null | undefined
): Permission[] {
  if (!user) return [];

  // SUPER_ADMIN gets all
  if (user.role === "SUPER_ADMIN") return Object.values(PERMISSIONS);

  // Combine role defaults with explicit permissions
  const rolePermissions = DEFAULT_PERMISSIONS[user.role || ""] || [];
  const explicitPermissions = (user.permissions || []) as Permission[];

  // Return unique set
  return [...new Set([...rolePermissions, ...explicitPermissions])];
}

/**
 * Check if user can delete members (convenience function)
 */
export function canDeleteMembers(user: UserWithPermissions | null | undefined): boolean {
  return hasPermission(user, PERMISSIONS.DELETE_MEMBERS);
}

/**
 * Check if user can delete leads (convenience function)
 */
export function canDeleteLeads(user: UserWithPermissions | null | undefined): boolean {
  return hasPermission(user, PERMISSIONS.DELETE_LEADS);
}
