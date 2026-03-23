import { useEffect } from "react";
import { useLocation } from "wouter";
import { isAdminRole } from "@/lib/permissions";
import { useStore } from "@/lib/store";

export default function AccessControl() {
  const [, setLocation] = useLocation();
  const { userProfile } = useStore();

  useEffect(() => {
    if (isAdminRole(userProfile.role)) {
      setLocation("/settings?tab=access-control");
      return;
    }

    setLocation("/");
  }, [setLocation, userProfile.role]);

  return null;
}
