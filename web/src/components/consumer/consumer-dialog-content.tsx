"use client";

import { useTranslations } from "next-intl";
import { useRef, type ComponentProps } from "react";
import { focusReturnTarget } from "@/components/consumer/focus-origin";
import { DialogContent } from "@/components/ui/dialog";

export function ConsumerDialogContent({
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: ComponentProps<typeof DialogContent>) {
  const t = useTranslations("consumer");
  const returnFocusTarget = useRef<HTMLElement | null>(null);

  return (
    <DialogContent
      closeLabel={t("dialogClose")}
      onOpenAutoFocus={(event) => {
        returnFocusTarget.current = focusReturnTarget();
        onOpenAutoFocus?.(event);
      }}
      onCloseAutoFocus={(event) => {
        onCloseAutoFocus?.(event);
        if (!event.defaultPrevented && returnFocusTarget.current?.isConnected) {
          event.preventDefault();
          const target = returnFocusTarget.current;
          // Radix removes its focus scope after this callback. Queue after
          // that teardown so WebKit does not drop the synchronous focus.
          window.setTimeout(() => target.focus(), 0);
        }
      }}
      {...props}
    />
  );
}
