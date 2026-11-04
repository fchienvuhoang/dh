"use client";

import { useEffect, useState } from "react";
import { AppLoading } from "@/components/app-loading";

export function PwaStartup() {
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setStarting(false));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!starting) return null;
  return (
    <div className="pwa-startup">
      <AppLoading />
    </div>
  );
}
