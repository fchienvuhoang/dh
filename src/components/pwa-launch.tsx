"use client";

import { useEffect } from "react";
import { AppLoading } from "@/components/app-loading";

export function PwaLaunch() {
  useEffect(() => {
    // Compatibility for installations that still launch at /khoi-dong.
    // Use a fresh document so its runtime always matches the current deployment.
    window.location.replace("/");
  }, []);
  return <AppLoading />;
}
