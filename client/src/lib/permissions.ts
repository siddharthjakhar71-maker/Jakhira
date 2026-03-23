import {
  ERP_PERMISSION_ACTIONS,
  ERP_PERMISSION_MODULES,
  createEmptyPermissionMap,
  isAdminRole,
  type PermissionAction,
  type PermissionMap,
  type PermissionModule,
} from "@shared/permissions";
import { useStore } from "@/lib/store";

export { ERP_PERMISSION_ACTIONS, ERP_PERMISSION_MODULES };
export type { PermissionAction, PermissionMap, PermissionModule };

export function hasPermission(
  permissionMap: PermissionMap | null | undefined,
  role: string | null | undefined,
  moduleName: PermissionModule,
  action: PermissionAction,
): boolean {
  if (isAdminRole(role)) return true;
  return Boolean(permissionMap?.[moduleName]?.[action]);
}

export function getFullPermissionMap(): PermissionMap {
  const permissionMap = createEmptyPermissionMap();
  for (const moduleName of ERP_PERMISSION_MODULES) {
    for (const action of ERP_PERMISSION_ACTIONS) {
      permissionMap[moduleName][action] = true;
    }
  }
  return permissionMap;
}

export function usePermissions() {
  const { userProfile, permissionMap } = useStore();
  const role = userProfile.role;

  return {
    permissionMap,
    canView: (moduleName: PermissionModule) => hasPermission(permissionMap, role, moduleName, "view"),
    canCreate: (moduleName: PermissionModule) => hasPermission(permissionMap, role, moduleName, "create"),
    canEdit: (moduleName: PermissionModule) => hasPermission(permissionMap, role, moduleName, "edit"),
    canDelete: (moduleName: PermissionModule) => hasPermission(permissionMap, role, moduleName, "delete"),
    canApprove: (moduleName: PermissionModule) => hasPermission(permissionMap, role, moduleName, "approve"),
  };
}
