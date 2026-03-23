import { useEffect } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { AccessControlSection } from "@/components/settings/sections";
import { usePermissions } from "@/lib/permissions";

export default function AccessControl() {
  const [, setLocation] = useLocation();
  const { isAdmin, canView } = usePermissions();
  const canAccess = isAdmin && canView("Users");

  useEffect(() => {
    if (!canAccess) {
      setLocation("/");
    }
  }, [canAccess, setLocation]);

  if (!canAccess) {
    return (
      <AppLayout>
        <div className="flex h-full flex-col items-center justify-center gap-4 pt-20 text-muted-foreground">
          <h1 className="text-2xl font-semibold text-foreground">Access Denied</h1>
          <p className="text-sm">Only administrators can open Access Control.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Access Control</h1>
          <p className="text-sm text-muted-foreground">Manage ERP users, activation status, and Admin / Viewer role assignments.</p>
        </div>
        <AccessControlSection />
      </div>
    </AppLayout>
  );
}
