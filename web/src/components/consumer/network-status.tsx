"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ConsumerSnackbar } from "@/components/consumer/blab-primitives";

export function NetworkStatus() {
  const t = useTranslations("consumer");
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateStatus = () => setIsOnline(window.navigator.onLine);
    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  if (isOnline) return null;

  return <ConsumerSnackbar message={t("reading.offline")} type="warning" role="alert" />;
}
