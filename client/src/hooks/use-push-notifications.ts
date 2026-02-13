import { useState, useCallback } from "react";

interface UsePushNotificationsOptions {
  customerToken?: string;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications({ customerToken }: UsePushNotificationsOptions = {}) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported = "serviceWorker" in navigator && "PushManager" in window;

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError("Push notifications not supported in this browser");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get VAPID key from server
      const keyRes = await fetch("/api/push/vapid-key");
      if (!keyRes.ok) throw new Error("Failed to get VAPID key");
      const { vapidPublicKey } = await keyRes.json();
      if (!vapidPublicKey) throw new Error("VAPID key not configured on server");

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notification permission denied");
        setIsLoading(false);
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      const keys = subscription.toJSON().keys!;

      // Send subscription to server
      const endpoint = customerToken
        ? `/api/customer/push/subscribe/${customerToken}`
        : "/api/push/subscribe";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        }),
      });

      if (!res.ok) throw new Error("Failed to save subscription");

      setIsSubscribed(true);
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to subscribe");
      setIsLoading(false);
      return false;
    }
  }, [isSupported, customerToken]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
  };
}
