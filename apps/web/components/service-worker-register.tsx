"use client";

import { useEffect } from "react";
import { shouldRegisterServiceWorker } from "@/lib/service-worker";

async function unregisterExistingServiceWorkers(): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

export function ServiceWorkerRegister(): null {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (!shouldRegisterServiceWorker()) {
      void unregisterExistingServiceWorkers();
      return;
    }

    void navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        console.info("SW registered");
      })
      .catch((error: unknown) => {
        console.warn("SW registration failed", error);
      });
  }, []);

  return null;
}
