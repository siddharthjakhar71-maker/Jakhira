import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Users() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/settings?tab=access-control");
  }, [setLocation]);

  return null;
}
