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
  MANAGER: "Manager",
  PURCHASE: "Purchase",
  ACCOUNTS: "Accounts",
  STORE: "Store",
  VIEWER: "Viewer",
} as const;

const VIEW_ONLY_ACTIONS = Object.fromEntries(
  ERP_PERMISSION_ACTIONS.map((action) => [action, action === "view"]),
) as Partial<Record<PermissionAction, boolean>>;

const MODULE_ACTION_OVERRIDES: Partial<
  Record<
    keyof typeof ERP_ROLES,
    Partial<Record<PermissionModule, Partial<Record<PermissionAction, boolean>>>>
  >
> = {
  ADMIN: {},
  MANAGER: {
    Dashboard: VIEW_ONLY_ACTIONS,
    Sites: { view: true, create: true, edit: true, approve: true, export: true },
    Vendors: { view: true, create: true, edit: true, approve: true, export: true },
    Materials: { view: true, create: true, edit: true, approve: true, export: true },
    "Purchase Orders": { view: true, create: true, edit: true, approve: true, export: true },
    GRN: { view: true, create: true, edit: true, approve: true, export: true },
    Bills: { view: true, create: true, edit: true, approve: true, export: true },
    Payments: { view: true, create: true, edit: true, approve: true, export: true },
    Stock: { view: true, create: true, edit: true, approve: true, export: true },
    Reports: { view: true, export: true },
    Settings: { view: true },
  },
  PURCHASE: {
    Dashboard: VIEW_ONLY_ACTIONS,
    Sites: { view: true, create: true, edit: true, export: true },
    Vendors: { view: true, create: true, edit: true, export: true },
    Materials: { view: true, create: true, edit: true, export: true },
    "Purchase Orders": { view: true, create: true, edit: true, approve: true, export: true },
    GRN: { view: true, create: true, edit: true, approve: true, export: true },
    Reports: { view: true, export: true },
  },
  ACCOUNTS: {
    Dashboard: VIEW_ONLY_ACTIONS,
    Vendors: { view: true },
    Bills: { view: true, create: true, edit: true, approve: true, export: true },
    Payments: { view: true, create: true, edit: true, approve: true, export: true },
    Reports: { view: true, export: true },
  },
  STORE: {
    Dashboard: VIEW_ONLY_ACTIONS,
    Materials: { view: true, create: true, edit: true, export: true },
    GRN: { view: true, create: true, edit: true, approve: true, export: true },
    Stock: { view: true, create: true, edit: true, approve: true, export: true },
  },
  VIEWER: {
    Dashboard: VIEW_ONLY_ACTIONS,
    Sites: VIEW_ONLY_ACTIONS,
    Vendors: VIEW_ONLY_ACTIONS,
    Materials: VIEW_ONLY_ACTIONS,
    "Purchase Orders": VIEW_ONLY_ACTIONS,
    GRN: VIEW_ONLY_ACTIONS,
    Bills: VIEW_ONLY_ACTIONS,
    Payments: VIEW_ONLY_ACTIONS,
    Stock: VIEW_ONLY_ACTIONS,
    Reports: VIEW_ONLY_ACTIONS,
    Settings: { view: true },
  },
};

export const ERP_ROLE_LIST = Object.values(ERP_ROLES) as string[];

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
  const roleKey = (Object.keys(ERP_ROLES).find(
    (key) => ERP_ROLES[key as keyof typeof ERP_ROLES].toLowerCase() === normalizedRole,
  ) || "VIEWER") as keyof typeof ERP_ROLES;
  const isAdmin = roleKey === "ADMIN";
  const overrides = MODULE_ACTION_OVERRIDES[roleKey] || {};
  const result: PermissionMap = {};

  for (const moduleName of ERP_PERMISSION_MODULES) {
    result[moduleName] = {};
    for (const action of ERP_PERMISSION_ACTIONS) {
      const baseAllowed = isAdmin ? true : false;
      const override = overrides[moduleName]?.[action];
      result[moduleName]![action] = typeof override === "boolean" ? override : baseAllowed;
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
