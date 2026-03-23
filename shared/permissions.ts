export const ERP_PERMISSION_MODULES = [
  "Dashboard",
  "Sites",
  "Vendors",
  "Materials",
  "Purchase Orders",
  "GRN",
  "Bills",
  "Payments",
  "Stock",
  "Reports",
  "Users",
  "Settings",
] as const;

export const ERP_PERMISSION_ACTIONS = ["view", "create", "edit", "delete", "approve"] as const;

export const ERP_ROLES = {
  ADMIN: "Admin",
  VIEWER: "Viewer",
} as const;

export type PermissionModule = (typeof ERP_PERMISSION_MODULES)[number];
export type PermissionAction = (typeof ERP_PERMISSION_ACTIONS)[number];
export type PermissionKey = `${PermissionModule}:${PermissionAction}`;
export type PermissionMap = Record<PermissionModule, Partial<Record<PermissionAction, boolean>>>;

export const ADMIN_ROLE_NAMES = new Set([ERP_ROLES.ADMIN, "admin", "administrator", "superadmin", "super-admin"]);

export const MODULE_ROUTE_MATCHERS: Array<{ pattern: RegExp; module: PermissionModule }> = [
  { pattern: /^\/api\/dashboard(?:\/|$)/, module: "Dashboard" },
  { pattern: /^\/api\/sites(?:\/|$)/, module: "Sites" },
  { pattern: /^\/api\/vendors(?:\/|$)/, module: "Vendors" },
  { pattern: /^\/api\/materials(?:\/|$)/, module: "Materials" },
  { pattern: /^\/api\/pos(?:\/|$)/, module: "Purchase Orders" },
  { pattern: /^\/api\/grns?(?:\/|$)/, module: "GRN" },
  { pattern: /^\/api\/bills?(?:\/|$)/, module: "Bills" },
  { pattern: /^\/api\/payments?(?:\/|$)/, module: "Payments" },
  { pattern: /^\/api\/(?:site-stock|material-issues)(?:\/|$)/, module: "Stock" },
  { pattern: /^\/api\/(?:reports|cost-analysis|vendor-ledger|vendor-statement|vendor-payables)(?:\/|$)/, module: "Reports" },
  { pattern: /^\/api\/users(?:\/|$)/, module: "Users" },
  { pattern: /^\/api\/system-tools(?:\/|$)/, module: "Settings" },
];

export function getPermissionModuleForPath(pathname: string): PermissionModule | null {
  const matched = MODULE_ROUTE_MATCHERS.find(({ pattern }) => pattern.test(pathname));
  return matched?.module ?? null;
}

export function isAdminRole(role: string | null | undefined): boolean {
  const normalizedRole = (role || "").trim();
  return ADMIN_ROLE_NAMES.has(normalizedRole) || ADMIN_ROLE_NAMES.has(normalizedRole.toLowerCase());
}

export function createEmptyPermissionMap(): PermissionMap {
  return ERP_PERMISSION_MODULES.reduce((acc, moduleName) => {
    acc[moduleName] = {};
    return acc;
  }, {} as PermissionMap);
}

export function permissionMapFromRecords(
  records: Array<{ module: string; action: string }>,
): PermissionMap {
  const permissionMap = createEmptyPermissionMap();

  for (const record of records) {
    if (
      ERP_PERMISSION_MODULES.includes(record.module as PermissionModule) &&
      ERP_PERMISSION_ACTIONS.includes(record.action as PermissionAction)
    ) {
      permissionMap[record.module as PermissionModule][record.action as PermissionAction] = true;
    }
  }

  return permissionMap;
}
