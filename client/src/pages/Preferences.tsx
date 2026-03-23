import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Preferences() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/settings");
  }, [setLocation]);

  return null;
}
