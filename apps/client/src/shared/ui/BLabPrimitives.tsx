"use client";

import {
  BLabBottomBar,
  BLabButton,
  BLabCard,
  BLabEmptyState,
  BLabErrorState,
  BLabPressableWrapper,
  BLabRetryButton,
  BLabSegmentedControl,
  BLabSnackbar,
  BLabTabBar,
  BLabLoadingState,
  BLabTextField,
} from "@byungsker/blab-design-system";
import type {
  BLabBottomBarProps,
  BLabButtonProps,
  BLabCardProps,
  BLabEmptyStateProps,
  BLabErrorStateProps,
  BLabLoadingStateProps,
  BLabPressableWrapperProps,
  BLabRetryButtonProps,
  BLabSegmentedControlProps,
  BLabSnackbarProps,
  BLabTabBarProps,
  BLabTextFieldProps,
} from "@byungsker/blab-design-system";

function consumerClassName(className: string | undefined) {
  return ["bookgolas-consumer-blab", className].filter(Boolean).join(" ");
}

export function ConsumerButton({ className, ...props }: BLabButtonProps) {
  return <BLabButton {...props} className={consumerClassName(className)} />;
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

export function ConsumerRetryButton({ className, ...props }: BLabRetryButtonProps) {
  return <BLabRetryButton {...props} className={consumerClassName(className)} />;
}

export function ConsumerSnackbar({ className, ...props }: BLabSnackbarProps) {
  return <BLabSnackbar {...props} className={consumerClassName(className)} />;
}

export function ConsumerPressable({ className, ...props }: BLabPressableWrapperProps) {
  return <BLabPressableWrapper {...props} className={consumerClassName(className)} />;
}

export function ConsumerTabBar({ className, ...props }: BLabTabBarProps) {
  return <BLabTabBar {...props} className={consumerClassName(className)} />;
}

export function ConsumerBottomBar({ className, ...props }: BLabBottomBarProps) {
  return <BLabBottomBar {...props} className={consumerClassName(className)} />;
}

export function ConsumerSegmentedControl<T>({
  className,
  ...props
}: BLabSegmentedControlProps<T>) {
  return <BLabSegmentedControl {...props} className={consumerClassName(className)} />;
}
