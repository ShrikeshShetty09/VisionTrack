"use client";

import React, { useEffect, useState } from "react";
import { Bell, BellRing, CheckCircle, ShieldAlert, X } from "lucide-react";
import { useAuth } from "../auth-provider";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationManager() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Helper to save subscription to database
  const syncSubscriptionWithBackend = async (sub: PushSubscription) => {
    try {
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub,
          deviceName: navigator.userAgent.includes("Windows") ? "Windows Desktop" : "Workstation Browser",
        }),
      });
    } catch (err) {
      console.warn("[Push Auto-Sync]: Backend sync failed:", err);
    }
  };

  const autoSubscribe = async (reg: ServiceWorkerRegistration) => {
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BOH0q90z44pZq9v8MvUeX_qU4jB9bT3aP0lJ8f3m1cT0pQ2n4r6v8x0z2y4w6u8s0q2n4r6v8x0z2y4w6u8s0";
      const newSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      setIsSubscribed(true);
      await syncSubscriptionWithBackend(newSub);
    } catch (err) {
      console.warn("[Push Auto-Subscribe Error]: Failed to create background subscription:", err);
    }
  };

  useEffect(() => {
    if (!user || typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window)) {
      return;
    }

    setPermission(Notification.permission);

    // Register service worker
    navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          setIsSubscribed(true);
          // Always keep subscription synced to backend for current user session
          await syncSubscriptionWithBackend(sub);
        } else if (Notification.permission === "granted") {
          // If browser granted permissions earlier, auto-renew subscription silently
          await autoSubscribe(reg);
        } else if (Notification.permission === "default") {
          // Show banner if not asked yet
          const dismissed = sessionStorage.getItem("vt-push-banner-dismissed");
          if (!dismissed) {
            setShowBanner(true);
          }
        }
      })
      .catch((err) => {
        console.warn("[ServiceWorker Registration Error]:", err);
      });
  }, [user]);

  const requestSubscription = async () => {
    try {
      setLoading(true);
      setStatusMessage("Requesting permission...");

      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setStatusMessage("Notification permission was not granted.");
        setLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BOH0q90z44pZq9v8MvUeX_qU4jB9bT3aP0lJ8f3m1cT0pQ2n4r6v8x0z2y4w6u8s0q2n4r6v8x0z2y4w6u8s0";

      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      // Save to database
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription,
          deviceName: navigator.userAgent.includes("Windows") ? "Windows Desktop" : "Workstation Browser",
        }),
      });

      setIsSubscribed(true);
      setShowBanner(false);
      setStatusMessage("Push notifications enabled successfully!");
    } catch (err: any) {
      console.error("[Push Subscription Error]:", err);
      setStatusMessage("Could not enable push: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const dismissBanner = () => {
    setShowBanner(false);
    sessionStorage.setItem("vt-push-banner-dismissed", "true");
  };

  if (!showBanner || !user || permission === "granted" || permission === "denied") {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-3 shadow-lg relative z-40 animate-fade-in">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg shrink-0">
            <BellRing className="h-5 w-5 text-white animate-bounce" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Enable Real-Time Browser Notifications</h4>
            <p className="text-xs text-blue-100">
              Receive instant alerts for assignments, fixes, deadlines, and testing updates even when VisionTrack is in another tab or minimized.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={requestSubscription}
            disabled={loading}
            className="px-4 py-1.5 bg-white text-blue-700 hover:bg-blue-50 text-xs font-semibold rounded-lg shadow transition disabled:opacity-75 flex items-center gap-1.5"
          >
            <Bell className="h-3.5 w-3.5" />
            {loading ? "Enabling..." : "Enable Notifications"}
          </button>
          <button
            onClick={dismissBanner}
            className="p-1.5 hover:bg-white/10 rounded-lg text-blue-100 hover:text-white transition"
            title="Dismiss for now"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
