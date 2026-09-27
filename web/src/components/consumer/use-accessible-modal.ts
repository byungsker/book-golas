"use client";

import { useEffect, useRef } from "react";
import { focusReturnTarget } from "@/components/consumer/focus-origin";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => !element.hidden && element.getAttribute("aria-hidden") !== "true",
  );
}

export function useAccessibleModal<ElementType extends HTMLElement = HTMLElement>(open: boolean, onClose: () => void) {
  const dialogRef = useRef<ElementType>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = focusReturnTarget();
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusFirst = () => {
      const [first] = focusableElements(dialog);
      (first ?? dialog).focus();
    };

    const frame = window.requestAnimationFrame(focusFirst);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = focusableElements(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      // Keep every Tab transition inside the dialog. WebKit can otherwise
      // move from the first button to document.body before it reaches the
      // remaining controls in a custom, non-portal surface.
      event.preventDefault();
      const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
      const offset = event.shiftKey ? -1 : 1;
      const nextIndex = activeIndex < 0
        ? (event.shiftKey ? focusable.length - 1 : 0)
        : (activeIndex + offset + focusable.length) % focusable.length;
      focusable[nextIndex]?.focus();
    };
    const handleFocusIn = (event: FocusEvent) => {
      if (!dialog.contains(event.target as Node)) focusFirst();
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("focusin", handleFocusIn, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("focusin", handleFocusIn, true);
      if (previouslyFocused?.isConnected) {
        // The modal is removed during this cleanup. Queue after teardown so
        // WebKit does not discard focus with the removed surface.
        window.setTimeout(() => previouslyFocused.focus(), 0);
      }
    };
  }, [open]);

  return dialogRef;
}
