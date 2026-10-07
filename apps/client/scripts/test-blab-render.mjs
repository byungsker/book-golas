import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BLabButton,
  BLabEmptyState,
  BLabErrorState,
  BLabLoadingState,
  BLabRetryButton,
  BLabTextField,
} from "@byungsker/blab-design-system";

const rendered = [
  renderToStaticMarkup(React.createElement(BLabLoadingState, { label: "Loading" })),
  renderToStaticMarkup(React.createElement(BLabEmptyState, { title: "Empty", message: "No books" })),
  renderToStaticMarkup(React.createElement(BLabErrorState, { title: "Error", message: "Try again" })),
  renderToStaticMarkup(React.createElement(BLabRetryButton, { label: "Retry", onClick: () => {} })),
].join("\n");

const loadingButton = renderToStaticMarkup(
  React.createElement(BLabButton, { text: "Working", loading: true, loadingLabel: "Loading" }),
);
const textField = renderToStaticMarkup(
  React.createElement(BLabTextField, {
    id: "email",
    label: "Email",
    value: "",
    onChange: () => undefined,
    error: "Email is required",
  }),
);

for (const marker of [
  'class="blab-loading-state" role="status" aria-live="polite"',
  'class="blab-empty-state" role="status"',
  'class="blab-error-state" role="alert"',
  'data-blab-component="button"',
]) {
  if (!rendered.includes(marker)) {
    console.error(`BLDS SSR contract is missing: ${marker}`);
    process.exit(1);
  }
}

if (!loadingButton.includes('aria-busy="true"') || !loadingButton.includes("disabled")) {
  console.error("BLDS loading button lost its disabled/aria-busy contract");
  process.exit(1);
}
if (
  !textField.includes('data-blab-component="text-field"') ||
  !textField.includes('id="email"') ||
  !textField.includes('<label') ||
  !textField.includes('for="email"') ||
  !textField.includes('aria-describedby="email-error"') ||
  !textField.includes('aria-invalid="true"') ||
  !textField.includes('id="email-error"') ||
  !textField.includes('role="alert"')
) {
  console.error("BLDS text field lost its label/error accessibility contract");
  process.exit(1);
}

console.log("BLDS SSR state contract passed: loading, empty, error, retry, loading button, text field and accessible roles");
