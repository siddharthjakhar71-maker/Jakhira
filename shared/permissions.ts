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
  "Settings",
] as const;

export const ERP_PERMISSION_ACTIONS = ["view", "create", "edit", "delete", "approve", "export"] as const;

export const ERP_ROLES = {
  ADMIN: "Admin",
  VIEWER: "Viewer",
} as const;

export type PermissionModule = (typeof ERP_PERMISSION_MODULES)[number];
export type PermissionAction = (typeof ERP_PERMISSION_ACTIONS)[number];

export const PERMISSION_ROUTE_MAP: Record<string, PermissionModule> = {
  "/": "Dashboard",
  "/sites": "Sites",
  "/vendors": "Vendors",
  "/materials": "Materials",
  "/pos": "Purchase Orders",
  "/grn": "GRN",
  "/bills": "Bills",
  "/payments": "Payments",
  "/stock": "Stock",
  "/reports": "Reports",
  "/settings": "Settings",
};

export type PermissionMap = Partial<Record<PermissionModule, Partial<Record<PermissionAction, boolean>>>>;

export function buildRolePermissionMap(role: string): PermissionMap {
  const normalizedRole = (role || "").trim().toLowerCase();
  const isAdmin = normalizedRole === ERP_ROLES.ADMIN.toLowerCase();
  const result: PermissionMap = {};

  for (const moduleName of ERP_PERMISSION_MODULES) {
    result[moduleName] = {};
    for (const action of ERP_PERMISSION_ACTIONS) {
      result[moduleName]![action] = isAdmin ? true : action === "view";
    }
  }

  return result;
}

export function canAccess(
  map: PermissionMap | undefined,
  role: string | undefined,
  moduleName: PermissionModule,
  action: PermissionAction,
): boolean {
  const roleMap = map || buildRolePermissionMap(role || ERP_ROLES.VIEWER);
  return Boolean(roleMap[moduleName]?.[action]);
}
