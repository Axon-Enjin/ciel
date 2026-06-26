"use client";

import * as React from "react";
import { flushOutbox, registerBackgroundSync } from "@/lib/field-sync";

/**
 * Register the field-capture service worker once for workspace routes.
 * This enables Background Sync where supported, with online fallback.
 */
export function RegisterFieldServiceWorker() {
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let active = true;
    const isProd = process.env.NODE_ENV === "production";

    const unregisterDevWorker = async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations
          .filter((registration) => registration.active?.scriptURL.endsWith("/sw.js"))
          .map((registration) => registration.unregister()),
      );
    };

    const register = async () => {
      try {
        if (!isProd) {
          await unregisterDevWorker();
          return;
        }
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await registerBackgroundSync();
      } catch {
        // Fail silently in unsupported browsers.
      }
    };

    const syncNow = () => {
      void flushOutbox();
    };

    const onMessage = (event: MessageEvent) => {
      if (!active) return;
      if (event.data?.type === "ciel-sync-outbox") {
        void flushOutbox();
      }
    };

    window.addEventListener("online", syncNow);
    navigator.serviceWorker.addEventListener("message", onMessage);
    void register();

    return () => {
      active = false;
      window.removeEventListener("online", syncNow);
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, []);

  return null;
}
