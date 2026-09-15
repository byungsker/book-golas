"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Library,
  UserCircle,
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
} from "@/components/consumer/blab-primitives";

type NavigationMode = "all" | "records" | "notes";

export function UiPrimitivesShowcase() {
  const t = useTranslations("consumer.uiPrimitives");
  const [buttonFeedback, setButtonFeedback] = useState(false);
  const [cardFeedback, setCardFeedback] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedMode, setSelectedMode] = useState<NavigationMode>("all");
  const [selectedNavigation, setSelectedNavigation] = useState(0);
  const [pressableFeedback, setPressableFeedback] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(true);
  const [bookTitle, setBookTitle] = useState(t("field.value"));
  const [page, setPage] = useState("512");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");

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
                <div className="bookgolas-ui-showcase__actions">
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
                  />
                  <BoundaryState
                    data-testid="consent-state"
                    title={t("boundaries.consentTitle")}
                    message={t("boundaries.consentMessage")}
                    action={t("boundaries.consent")}
                  />
                  <BoundaryState
                    data-testid="quota-state"
                    title={t("boundaries.quotaTitle")}
                    message={t("boundaries.quotaMessage")}
                    action={t("boundaries.quota")}
                  />
                  <BoundaryState
                    data-testid="offline-state"
                    title={t("boundaries.offlineTitle")}
                    message={t("boundaries.offlineMessage")}
                    action={t("boundaries.reconnect")}
                  />
                </div>
                <p className="bookgolas-ui-showcase__boundary-footnote">{t("boundariesFootnote")}</p>
              </div>
            </ConsumerCard>
          </section>
        </div>
      </div>
    </main>
  );
}

function BoundaryState({
  title,
  message,
  action,
  ...props
}: {
  title: string;
  message: string;
  action: string;
  "data-testid"?: string;
}) {
  return (
    <div className="bookgolas-ui-showcase__boundary" role="status" {...props}>
      <h3>{title}</h3>
      <p>{message}</p>
      <ConsumerButton text={action} variant="secondary" />
    </div>
  );
}
