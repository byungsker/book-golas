"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Library,
  UserCircle,
  Search,
  MoreHorizontal,
} from "lucide-react";
import {
  ConsumerBottomBar,
  ConsumerButton,
  ConsumerCard,
  ConsumerEmptyState,
  ConsumerErrorState,
  ConsumerLoadingState,
  ConsumerPressable,
  ConsumerSegmentedControl,
  ConsumerSnackbar,
  ConsumerTabBar,
  ConsumerTextField,
} from "@/shared/ui";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/primitives";
import { ConsumerDialogContent as DialogContent } from "@/shared/ui";

type NavigationMode = "all" | "records" | "notes";
type BoundaryStateId = "unauthorized-state" | "consent-state" | "quota-state" | "offline-state";

export function UiPrimitivesShowcase() {
  const t = useTranslations("consumer.uiPrimitives");
  const [buttonFeedback, setButtonFeedback] = useState(false);
  const [cardFeedback, setCardFeedback] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedMode, setSelectedMode] = useState<NavigationMode>("all");
  const [selectedNavigation, setSelectedNavigation] = useState(0);
  const [pressableFeedback, setPressableFeedback] = useState(false);
  const [selectedBoundary, setSelectedBoundary] = useState<BoundaryStateId | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(true);
  const [bookTitle, setBookTitle] = useState(t("field.value"));
  const [page, setPage] = useState("512");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextOutcome, setContextOutcome] = useState("");
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [overlaySearch, setOverlaySearch] = useState("");
  const contextTriggerRef = useRef<HTMLButtonElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenuOpen) return;
    contextMenuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setContextMenuOpen(false);
      contextTriggerRef.current?.focus();
    };
    document.addEventListener("keydown", close, true);
    return () => document.removeEventListener("keydown", close, true);
  }, [contextMenuOpen]);

  const navigationItems = [
    { icon: <BookOpen aria-hidden="true" />, activeIcon: <BookOpen aria-hidden="true" />, label: t("navigation.tabs.0") },
    { icon: <Library aria-hidden="true" />, activeIcon: <Library aria-hidden="true" />, label: t("navigation.tabs.1") },
    { icon: <BarChart3 aria-hidden="true" />, activeIcon: <BarChart3 aria-hidden="true" />, label: t("navigation.tabs.2") },
    { icon: <CalendarDays aria-hidden="true" />, activeIcon: <CalendarDays aria-hidden="true" />, label: t("navigation.calendar") },
    { icon: <UserCircle aria-hidden="true" />, activeIcon: <UserCircle aria-hidden="true" />, label: t("navigation.account") },
  ] as const;

  return (
    <main className="bookgolas-ui-showcase" data-testid="ui-primitives-showcase">
      <div className="bookgolas-ui-showcase__shell">
        <header className="bookgolas-ui-showcase__intro">
          <p className="bookgolas-ui-showcase__eyebrow">{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p className="bookgolas-ui-showcase__description">{t("description")}</p>
          <p className="bookgolas-ui-showcase__viewport-note">{t("viewportNote")}</p>
        </header>

        <div className="bookgolas-ui-showcase__grid">
          <section aria-labelledby="showcase-buttons" className="bookgolas-ui-showcase__section">
            <ConsumerCard>
              <div className="bookgolas-ui-showcase__section-content">
                <h2 id="showcase-buttons">{t("button.heading")}</h2>
                <div className="bookgolas-ui-showcase__actions" data-testid="button-actions">
                  <ConsumerButton
                    data-testid="primary-button"
                    text={t("button.primary")}
                    onClick={() => setButtonFeedback(true)}
                  />
                  <ConsumerButton data-testid="secondary-button" text={t("button.secondary")} variant="secondary" />
                  <ConsumerButton data-testid="destructive-button" text={t("button.destructive")} variant="destructive" />
                  <ConsumerButton data-testid="loading-button" text={t("button.loading")} loading loadingLabel={t("button.loading")} />
                  <ConsumerButton data-testid="disabled-button" text={t("button.disabled")} disabled variant="secondary" />
                </div>
                {buttonFeedback ? (
                  <p className="bookgolas-ui-showcase__feedback" data-testid="button-feedback" role="status">
                    {t("button.activated")}
                  </p>
                ) : null}
              </div>
            </ConsumerCard>
          </section>

          <section aria-labelledby="showcase-cards" className="bookgolas-ui-showcase__section">
            <ConsumerCard>
              <div className="bookgolas-ui-showcase__section-content">
                <h2 id="showcase-cards">{t("card.heading")}</h2>
                <div className="bookgolas-ui-showcase__stack">
                  <ConsumerCard data-testid="static-card">
                    <h3>{t("card.staticTitle")}</h3>
                    <p>{t("card.staticMessage")}</p>
                  </ConsumerCard>
                  <ConsumerCard
                    data-testid="interactive-card"
                    onClick={() => setCardFeedback(true)}
                    aria-label={t("card.interactiveTitle")}
                  >
                    <h3>{t("card.interactiveTitle")}</h3>
                    <p>{t("card.interactiveMessage")}</p>
                  </ConsumerCard>
                  <ConsumerCard data-testid="disabled-card" disabled>
                    <h3>{t("card.disabledTitle")}</h3>
                  </ConsumerCard>
                </div>
                {cardFeedback ? (
                  <p className="bookgolas-ui-showcase__feedback" data-testid="card-feedback" role="status">
                    {t("card.activated")}
                  </p>
                ) : null}
              </div>
            </ConsumerCard>
          </section>

          <section aria-labelledby="showcase-fields" className="bookgolas-ui-showcase__section">
            <ConsumerCard>
              <div className="bookgolas-ui-showcase__section-content">
                <h2 id="showcase-fields">{t("field.heading")}</h2>
                <div className="bookgolas-ui-showcase__field-stack">
                  <ConsumerTextField
                    id="showcase-book-title"
                    name="book-title"
                    label={t("field.label")}
                    hintText={t("field.placeholder")}
                    value={bookTitle}
                    onChange={(event) => setBookTitle(event.target.value)}
                    required
                  />
                  <ConsumerTextField
                    id="showcase-page"
                    name="page"
                    label={t("field.errorLabel")}
                    hintText={t("field.errorPlaceholder")}
                    value={page}
                    onChange={(event) => setPage(event.target.value)}
                    error={t("field.error")}
                    inputMode="numeric"
                  />
                  <ConsumerTextField
                    id="showcase-password"
                    name="password"
                    label={t("field.passwordLabel")}
                    hintText={t("field.passwordPlaceholder")}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    obscureText
                    autoComplete="current-password"
                  />
                  <ConsumerTextField
                    id="showcase-note"
                    name="note"
                    label={t("field.multilineLabel")}
                    hintText={t("field.multilinePlaceholder")}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLines={3}
                  />
                </div>
              </div>
            </ConsumerCard>
          </section>

          <section aria-labelledby="showcase-feedback" className="bookgolas-ui-showcase__section">
            <ConsumerCard>
              <div className="bookgolas-ui-showcase__section-content">
                <h2 id="showcase-feedback">{t("feedback.heading")}</h2>
                <div className="bookgolas-ui-showcase__state-stack">
                  <div data-testid="loading-state">
                    <ConsumerLoadingState label={t("feedback.loading")} />
                  </div>
                  <div data-testid="empty-state">
                    <ConsumerEmptyState
                      title={t("feedback.emptyTitle")}
                      message={t("feedback.emptyMessage")}
                      actionLabel={t("feedback.emptyAction")}
                      onAction={() => setButtonFeedback(true)}
                    />
                  </div>
                  <div data-testid="error-state">
                    <ConsumerErrorState
                      title={t("feedback.errorTitle")}
                      message={t("feedback.errorMessage")}
                      retryLabel={t("feedback.retry")}
                      onRetry={() => setRetryCount((count) => count + 1)}
                      retryLoading={false}
                    />
                  </div>
                </div>
                <p className="bookgolas-ui-showcase__feedback" data-testid="retry-feedback" role="status">
                  {retryCount > 0 ? `${t("feedback.retried")} (${retryCount})` : t("feedback.retry")}
                </p>
                {snackbarVisible ? (
                  <ConsumerSnackbar
                    data-testid="snackbar"
                    message={t("feedback.snackbar")}
                    role="status"
                    onDismiss={() => setSnackbarVisible(false)}
                    dismissLabel={t("feedback.dismiss")}
                  />
                ) : null}
              </div>
            </ConsumerCard>
          </section>

          <section aria-labelledby="showcase-navigation" className="bookgolas-ui-showcase__section bookgolas-ui-showcase__section--wide">
            <ConsumerCard>
              <div className="bookgolas-ui-showcase__section-content">
                <h2 id="showcase-navigation">{t("navigation.heading")}</h2>
                <div className="bookgolas-ui-showcase__navigation-stack">
                  <ConsumerTabBar
                    tabs={[t("navigation.tabs.0"), t("navigation.tabs.1"), t("navigation.tabs.2")]}
                    selectedIndex={selectedTab}
                    onTabSelected={setSelectedTab}
                    ariaLabel={t("navigation.tabLabel")}
                    isScrollable
                  />
                  <ConsumerSegmentedControl<NavigationMode>
                    items={[
                      { value: "all", label: t("navigation.segments.0") },
                      { value: "records", label: t("navigation.segments.1") },
                      { value: "notes", label: t("navigation.segments.2") },
                    ]}
                    selectedValue={selectedMode}
                    onChanged={setSelectedMode}
                    ariaLabel={t("navigation.segmentLabel")}
                  />
                  <ConsumerBottomBar
                    tabs={navigationItems}
                    selectedIndex={selectedNavigation}
                    onTabSelected={setSelectedNavigation}
                    ariaLabel={t("navigation.bottomBarLabel")}
                    noMargin
                  />
                </div>
                <p className="bookgolas-ui-showcase__feedback" data-testid="navigation-feedback" role="status">
                  {t("navigation.tabs." + selectedTab)} · {t("navigation.selected")}
                </p>
              </div>
            </ConsumerCard>
          </section>

          <section aria-labelledby="showcase-pressable" className="bookgolas-ui-showcase__section">
            <ConsumerCard>
              <div className="bookgolas-ui-showcase__section-content">
                <h2 id="showcase-pressable">{t("pressable.heading")}</h2>
                <div data-testid="pressable">
                  <ConsumerPressable
                    ariaLabel={t("pressable.label")}
                    onTap={() => setPressableFeedback(true)}
                  >
                    <span className="bookgolas-ui-showcase__pressable-content">{t("pressable.label")}</span>
                  </ConsumerPressable>
                </div>
                {pressableFeedback ? (
                  <p className="bookgolas-ui-showcase__feedback" data-testid="pressable-feedback" role="status">
                    {t("pressable.activated")}
                  </p>
                ) : null}
              </div>
            </ConsumerCard>
          </section>

          <section aria-labelledby="showcase-overlays" className="bookgolas-ui-showcase__section">
            <ConsumerCard>
              <div className="bookgolas-ui-showcase__section-content">
                <h2 id="showcase-overlays">{t("overlays.heading")}</h2>
                <div className="bookgolas-ui-showcase__actions">
                  <button ref={contextTriggerRef} type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--blab-glass-border)] px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" onClick={() => setContextMenuOpen((open) => !open)} aria-expanded={contextMenuOpen} data-testid="context-menu-open"><MoreHorizontal aria-hidden="true" size={16} />{t("overlays.contextOpen")}</button>
                  <ConsumerButton type="button" variant="secondary" icon={<Search aria-hidden="true" size={16} />} text={t("overlays.searchOpen")} onClick={() => setSearchOverlayOpen(true)} data-testid="search-overlay-open" />
                </div>
                {contextMenuOpen ? <div ref={contextMenuRef} role="menu" aria-label={t("overlays.contextLabel")} className="mt-3 grid gap-1 rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-elevated)] p-2" data-testid="context-menu" data-parity-actions="choose-context-action dismiss-context-menu"><button type="button" role="menuitem" className="min-h-11 rounded-lg px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" onClick={() => { setContextOutcome(t("overlays.contextChosen")); setContextMenuOpen(false); contextTriggerRef.current?.focus(); }}>{t("overlays.contextAction")}</button><button type="button" role="menuitem" className="min-h-11 rounded-lg px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" onClick={() => { setContextMenuOpen(false); contextTriggerRef.current?.focus(); }}>{t("overlays.dismiss")}</button></div> : null}
                {contextOutcome ? <p role="status" data-testid="context-menu-outcome" className="bookgolas-ui-showcase__feedback">{contextOutcome}</p> : null}
              </div>
            </ConsumerCard>
          </section>

          <section aria-labelledby="showcase-boundaries" className="bookgolas-ui-showcase__section bookgolas-ui-showcase__section--wide">
            <ConsumerCard>
              <div className="bookgolas-ui-showcase__section-content">
                <h2 id="showcase-boundaries">{t("boundaries.heading")}</h2>
                <div className="bookgolas-ui-showcase__boundary-grid">
                  <BoundaryState
                    data-testid="unauthorized-state"
                    title={t("boundaries.unauthorizedTitle")}
                    message={t("boundaries.unauthorizedMessage")}
                    action={t("boundaries.signIn")}
                    onAction={() => setSelectedBoundary("unauthorized-state")}
                    actionOutcome={selectedBoundary === "unauthorized-state" ? t("boundaries.unauthorizedMessage") : undefined}
                  />
                  <BoundaryState
                    data-testid="consent-state"
                    title={t("boundaries.consentTitle")}
                    message={t("boundaries.consentMessage")}
                    action={t("boundaries.consent")}
                    onAction={() => setSelectedBoundary("consent-state")}
                    actionOutcome={selectedBoundary === "consent-state" ? t("boundaries.consentMessage") : undefined}
                  />
                  <BoundaryState
                    data-testid="quota-state"
                    title={t("boundaries.quotaTitle")}
                    message={t("boundaries.quotaMessage")}
                    action={t("boundaries.quota")}
                    onAction={() => setSelectedBoundary("quota-state")}
                    actionOutcome={selectedBoundary === "quota-state" ? t("boundaries.quotaMessage") : undefined}
                  />
                  <BoundaryState
                    data-testid="offline-state"
                    title={t("boundaries.offlineTitle")}
                    message={t("boundaries.offlineMessage")}
                    action={t("boundaries.reconnect")}
                    onAction={() => setSelectedBoundary("offline-state")}
                    actionOutcome={selectedBoundary === "offline-state" ? t("boundaries.offlineMessage") : undefined}
                  />
                </div>
                <p className="bookgolas-ui-showcase__boundary-footnote">{t("boundariesFootnote")}</p>
              </div>
            </ConsumerCard>
          </section>
        </div>
      </div>

      <Dialog open={searchOverlayOpen} onOpenChange={setSearchOverlayOpen}>
        <DialogContent data-testid="search-overlay" data-parity-actions="search-with-keyboard dismiss-search-overlay" onCloseAutoFocus={(event) => { event.preventDefault(); document.querySelector<HTMLButtonElement>('[data-testid="search-overlay-open"]')?.focus(); }}>
          <DialogHeader><DialogTitle>{t("overlays.searchTitle")}</DialogTitle><DialogDescription>{t("overlays.searchDescription")}</DialogDescription></DialogHeader>
          <label className="grid gap-2 text-sm font-medium">{t("overlays.searchLabel")}<input autoFocus value={overlaySearch} onChange={(event) => setOverlaySearch(event.target.value)} className="min-h-11 rounded-xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface-card)] px-3" data-testid="search-overlay-input" /></label>
          <p role="status" data-testid="search-overlay-result" className="text-sm text-[var(--blab-text-secondary)]">{overlaySearch ? t("overlays.searchResult", { query: overlaySearch }) : t("overlays.searchEmpty")}</p>
          <DialogFooter><DialogClose asChild><ConsumerButton type="button" variant="secondary" text={t("overlays.dismiss")} /></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function BoundaryState({
  title,
  message,
  action,
  onAction,
  actionOutcome,
  ...props
}: {
  title: string;
  message: string;
  action: string;
  onAction: () => void;
  actionOutcome?: string;
  "data-testid"?: string;
}) {
  return (
    <div className="bookgolas-ui-showcase__boundary" role="status" {...props}>
      <h3>{title}</h3>
      <p>{message}</p>
      <ConsumerButton text={action} variant="secondary" onClick={onAction} />
      {actionOutcome ? (
        <p className="bookgolas-ui-showcase__feedback" data-testid={`${props["data-testid"]}-feedback`} role="status">
          {action} · {actionOutcome}
        </p>
      ) : null}
    </div>
  );
}
