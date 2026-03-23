import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Administration() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/access-control");
  }, [setLocation]);

  return null;
}
