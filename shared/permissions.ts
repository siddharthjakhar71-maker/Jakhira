export const ERP_PERMISSION_MODULES = ["GRN", "Bills", "Payments"] as const;

export const ERP_PERMISSION_ACTIONS = ["view", "create", "edit", "delete", "approve", "export"] as const;

export const ERP_ROLES = {
  ADMIN: "Admin",
  VIEWER: "Viewer",
} as const;

export type PermissionModule = (typeof ERP_PERMISSION_MODULES)[number];
export type PermissionAction = (typeof ERP_PERMISSION_ACTIONS)[number];

export const PERMISSION_ROUTE_MAP: Record<string, PermissionModule> = {
  "/grn": "GRN",
  "/bills": "Bills",
  "/payments": "Payments",
};
