"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

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

  return (
    <p
      className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100"
      role="alert"
    >
      {t("reading.offline")}
    </p>
  );
}
