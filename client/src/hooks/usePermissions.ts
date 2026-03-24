import { useCallback } from "react";
import { ERP_ROLES, type PermissionModule } from "@shared/permissions";
import { useStore } from "@/lib/store";

export function usePermissions() {
  const { can, userProfile, isAuthenticated, permissionMapLoading } = useStore();

  const isAdmin = (userProfile.role || "").trim().toLowerCase() === ERP_ROLES.ADMIN.toLowerCase();

  const canAction = useCallback(
    (moduleName: PermissionModule, action: "view" | "create" | "edit" | "delete" | "approve") => {
      if (isAdmin) {
        return true;
      }

      if (!isAuthenticated) {
        return false;
      }

      if (permissionMapLoading) {
        return action === "view" && moduleName === "Dashboard";
      }

      return can(moduleName, action);
    },
    [can, isAdmin, isAuthenticated, permissionMapLoading],
  );

  const canView = useCallback((moduleName: PermissionModule) => canAction(moduleName, "view"), [canAction]);
  const canCreate = useCallback((moduleName: PermissionModule) => canAction(moduleName, "create"), [canAction]);
  const canEdit = useCallback((moduleName: PermissionModule) => canAction(moduleName, "edit"), [canAction]);
  const canDelete = useCallback((moduleName: PermissionModule) => canAction(moduleName, "delete"), [canAction]);
  const canApprove = useCallback((moduleName: PermissionModule) => canAction(moduleName, "approve"), [canAction]);

  return {
    canView,
    canCreate,
    canEdit,
    canDelete,
    canApprove,
    permissionMapLoading,
    isAdmin,
  };
}
