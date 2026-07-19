"use client";

import { useEffect } from "react";

function isPwaEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_PWA_ENABLED === "false") {
    return false;
  }
  return (
    process.env.NEXT_PUBLIC_PWA_ENABLED === "true" ||
    process.env.NODE_ENV === "production"
  );
}

export function PwaRegister() {
  useEffect(() => {
    if (!isPwaEnabled()) {
      return;
    }
    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration can fail on insecure contexts or unsupported browsers.
    });
  }, []);

  return null;
}
