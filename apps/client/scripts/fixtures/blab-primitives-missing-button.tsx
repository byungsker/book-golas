"use client";

import {
  BLabCard,
  BLabEmptyState,
  BLabErrorState,
  BLabLoadingState,
  BLabTextField,
} from "@byungsker/blab-design-system";
import type {
  BLabCardProps,
  BLabEmptyStateProps,
  BLabErrorStateProps,
  BLabLoadingStateProps,
  BLabTextFieldProps,
} from "@byungsker/blab-design-system";

function consumerClassName(className: string | undefined) {
  return ["bookgolas-consumer-blab", className].filter(Boolean).join(" ");
}

export function ConsumerCard({ className, ...props }: BLabCardProps) {
  return <BLabCard {...props} className={consumerClassName(className)} />;
}

export function ConsumerTextField({ className, ...props }: BLabTextFieldProps) {
  return <BLabTextField {...props} className={consumerClassName(className)} />;
}

export function ConsumerLoadingState({ className, ...props }: BLabLoadingStateProps) {
  return <BLabLoadingState {...props} className={consumerClassName(className)} />;
}

export function ConsumerEmptyState({ className, ...props }: BLabEmptyStateProps) {
  return <BLabEmptyState {...props} className={consumerClassName(className)} />;
}

export function ConsumerErrorState({ className, ...props }: BLabErrorStateProps) {
  return <BLabErrorState {...props} className={consumerClassName(className)} />;
}
