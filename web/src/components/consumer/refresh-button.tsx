"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function RefreshButton() {
  const router = useRouter();
  const t = useTranslations("consumer");

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => router.refresh()}
      className="border-white/15 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white"
    >
      {t("home.refresh")}
    </Button>
  );
}
