"use client";

import { useEffect, useRef } from "react";

/**
 * Attempts to register for web push notifications.
 * Requires NEXT_PUBLIC_VAPID_PUBLIC_KEY env var and a service worker at /sw.js.
 * Gracefully no-ops when either is missing.
 */
export function usePushRegistration(): void {
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      // Web push not configured yet — skip silently
      return;
    }

    async function register() {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidKey,
          });
        }

        const token = JSON.stringify(subscription.toJSON());

        await fetch("/api/push-tokens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, platform: "WEB" }),
        });
      } catch (e) {
        // Non-critical — don't break the dashboard
        console.warn("[push] Registration failed:", e);
      }
    }

    register();
  }, []);
}
