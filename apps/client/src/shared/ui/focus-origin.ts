"use client";

let latestPointerTarget: HTMLElement | null = null;

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

if (typeof document !== "undefined") {
  document.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    latestPointerTarget = target.closest<HTMLElement>(focusableSelector);
  }, true);
}

export function focusReturnTarget(): HTMLElement | null {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body && active.isConnected) return active;
  return latestPointerTarget?.isConnected ? latestPointerTarget : null;
}
