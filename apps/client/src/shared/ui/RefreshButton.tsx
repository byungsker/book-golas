"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ConsumerButton } from "./BLabPrimitives";

export function RefreshButton() {
  const router = useRouter();
  const t = useTranslations("consumer");

  return (
    <ConsumerButton
      type="button"
      variant="secondary"
      onClick={() => router.refresh()}
    >
      {t("home.refresh")}
    </ConsumerButton>
  );
}
