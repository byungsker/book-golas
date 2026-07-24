"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinWaitlist } from "@/app/actions/waitlist";

type Status =
  | "idle"
  | "submitting"
  | "success"
  | "duplicate"
  | "invalid"
  | "error";

export function WaitlistModal({
  open,
  onOpenChange,
  source = "landing",
  locale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: string;
  locale: string;
}) {
  const t = useTranslations("waitlist");
  const [status, setStatus] = useState<Status>("idle");
  const [, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setStatus("submitting");
    startTransition(async () => {
      const result = await joinWaitlist(formData);
      if (result.ok) {
        setStatus("success");
      } else if (result.code === "duplicate") {
        setStatus("duplicate");
      } else if (result.code === "invalid") {
        setStatus("invalid");
      } else {
        setStatus("error");
      }
    });
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTimeout(() => setStatus("idle"), 200);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="border-white/10 sm:max-w-md"
        style={{
          background: "linear-gradient(180deg,#15172a 0%,#0d0f1a 100%)",
          color: "white",
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("title")}
          </DialogTitle>
          <DialogDescription style={{ color: "rgba(255,255,255,0.55)" }}>
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        {status === "success" ? (
          <div className="py-6 text-center">
            <div className="mb-3 text-4xl">🎉</div>
            <p
              className="mb-1 font-semibold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("successTitle")}
            </p>
            <p
              className="text-sm"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              {t("successDesc")}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label
                htmlFor="waitlist-email"
                className="text-white/80"
              >
                {t("emailLabel")}
              </Label>
              <Input
                id="waitlist-email"
                type="email"
                name="email"
                placeholder={t("emailPlaceholder")}
                autoComplete="email"
                required
                disabled={status === "submitting"}
                className="border-white/15 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-[#5B7FFF] focus-visible:ring-[#5B7FFF]/30"
              />
            </div>
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="source" value={source} />

            {status === "duplicate" && (
              <p className="text-sm text-amber-300">{t("duplicate")}</p>
            )}
            {status === "invalid" && (
              <p className="text-sm text-rose-300">{t("invalid")}</p>
            )}
            {status === "error" && (
              <p className="text-sm text-rose-300">{t("error")}</p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full rounded-xl py-2.5 font-semibold text-white transition disabled:opacity-60"
              style={{
                fontFamily: "var(--font-display)",
                background: "linear-gradient(135deg,#5B7FFF,#6B8AFF)",
                boxShadow: "0 8px 24px rgba(91,127,255,0.35)",
              }}
            >
              {status === "submitting" ? t("submitting") : t("submit")}
            </button>
            <p
              className="text-center text-xs"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              {t("privacy")}
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
