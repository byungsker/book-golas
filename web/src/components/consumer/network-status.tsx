"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ConsumerSnackbar } from "@/components/consumer/blab-primitives";
import { getReconnectAnnouncement } from "@/lib/consumer/offline-boundary";

type NetworkState = "online" | "offline" | "reconnected";

export function NetworkStatus() {
  const t = useTranslations("consumer");
  const [networkState, setNetworkState] = useState<NetworkState>("online");
  const wasOffline = useRef(false);

  useEffect(() => {
    const handleOffline = () => {
      wasOffline.current = true;
      setNetworkState("offline");
    };
    const handleOnline = () => {
      if (wasOffline.current) {
        wasOffline.current = false;
        window.dispatchEvent(new CustomEvent(getReconnectAnnouncement().event));
        setNetworkState("reconnected");
        return;
      }
      setNetworkState("online");
    };

    if (!window.navigator.onLine) handleOffline();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (networkState === "online") return null;

  const reconnectAnnouncement = getReconnectAnnouncement();
  return (
    <ConsumerSnackbar
      data-testid="network-status"
      data-network-state={networkState}
      data-online-core="true"
      data-queue-enabled="false"
      data-mutation-mode={networkState === "offline" ? "read-only" : "retryable"}
      data-reconnect-event={reconnectAnnouncement.event}
      data-retry-on-reconnect={String(reconnectAnnouncement.retryable)}
      message={networkState === "offline" ? t("network.offline") : t("network.reconnected")}
      type={networkState === "offline" ? "warning" : "success"}
      role="alert"
      onDismiss={() => setNetworkState("online")}
      dismissLabel={t("network.dismiss")}
    />
  );
}
