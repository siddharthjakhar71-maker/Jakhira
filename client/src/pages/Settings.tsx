import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";

export default function Settings() {
  const [location, setLocation] = useLocation();
  const params = useMemo(() => new URLSearchParams(location.split("?")[1] || ""), [location]);
  const tab = params.get("tab") || "preferences";

  useEffect(() => {
    if (tab === "profile") {
      setLocation("/profile");
      return;
    }
    if (tab === "access-control") {
      setLocation("/access-control");
      return;
    }
    setLocation("/preferences");
  }, [setLocation, tab]);

  return null;
}
