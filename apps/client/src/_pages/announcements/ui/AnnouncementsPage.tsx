import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { ConsumerCard, ConsumerEmptyState, ConsumerErrorState } from "@/shared/ui";
import { ConsumerHeader } from "@/widgets/consumer-header";
import { getConsumerRouteFixture } from "@/shared/config";
import { getConsumerPath, getConsumerSignInRedirectPath, isConsumerLocale, type ConsumerLocale } from "@/shared/routing";
import { getCurrentConsumerUser } from "@/shared/auth/index.server";
import { createServerSupabaseClient } from "@/shared/api/supabase/index.server";

export const dynamic = "force-dynamic";

const AnnouncementRowSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
  sent_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
}).strict();

type Announcement = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly sentAt: string | null;
  readonly createdAt: string;
};

const fixtureAnnouncements: readonly Announcement[] = [{
  id: "00000000-0000-4000-8000-000000000701",
  title: "Bookgolas Web update",
  body: "Your reading records, account preferences, and browser boundaries are available from the updated consumer experience.",
  sentAt: "2026-09-20T09:00:00.000Z",
  createdAt: "2026-09-20T09:00:00.000Z",
}] as const;

function formatAnnouncementDate(locale: ConsumerLocale, value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", { dateStyle: "medium" }).format(date);
}

async function readAnnouncements(): Promise<
  | { readonly kind: "ready"; readonly announcements: readonly Announcement[] }
  | { readonly kind: "error" }
> {
  const fixture = getConsumerRouteFixture((await cookies()).get("bookgolas-route-fixture")?.value);
  if (fixture === "announcements-content") return { kind: "ready", announcements: fixtureAnnouncements };
  if (fixture === "announcements-empty") return { kind: "ready", announcements: [] };
  if (fixture === "announcements-error") return { kind: "error" };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("push_announcements")
      .select("id,title,body,sent_at,created_at")
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
      .limit(20);
    const parsed = z.array(AnnouncementRowSchema).safeParse(data);
    if (error || !parsed.success) return { kind: "error" };
    return {
      kind: "ready",
      announcements: parsed.data.map((announcement) => ({
        id: announcement.id,
        title: announcement.title,
        body: announcement.body,
        sentAt: announcement.sent_at,
        createdAt: announcement.created_at,
      })),
    };
  } catch {
    return { kind: "error" };
  }
}

export default async function AnnouncementsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isConsumerLocale(rawLocale)) redirect("/ko/auth/sign-in");
  const locale = rawLocale;
  const { user, unavailable } = await getCurrentConsumerUser();
  if (!user && !unavailable) redirect(getConsumerSignInRedirectPath(locale, getConsumerPath(locale, "/announcements")));

  const t = await getTranslations("consumer.announcements");
  const result = user ? await readAnnouncements() : { kind: "error" as const };

  return (
    <div className="bookgolas-consumer-page min-h-dvh bg-[var(--blab-surface-scaffold)] text-[var(--blab-text-primary)]" data-testid="consumer-announcements" data-route-state={result.kind}>
      <ConsumerHeader locale={locale} authenticated />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <p className="text-sm font-medium text-[var(--blab-color-primary)]">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--blab-text-tertiary)]">{t("description")}</p>
        <section className="mt-8" aria-label={t("listLabel")}>
          {result.kind === "error" ? (
            <ConsumerCard><ConsumerErrorState title={t("errorTitle")} message={t("errorDescription")} retryLabel={t("retry")} /></ConsumerCard>
          ) : result.announcements.length === 0 ? (
            <ConsumerCard><ConsumerEmptyState title={t("emptyTitle")} message={t("emptyDescription")} /></ConsumerCard>
          ) : (
            <div className="grid gap-4">
              {result.announcements.map((announcement) => {
                const sentOn = formatAnnouncementDate(locale, announcement.sentAt ?? announcement.createdAt);
                return (
                  <ConsumerCard key={announcement.id} data-testid="consumer-announcement">
                    {sentOn ? <p className="text-sm text-[var(--blab-text-tertiary)]">{t("sentOn", { date: sentOn })}</p> : null}
                    <h2 className="mt-2 text-xl font-semibold">{announcement.title}</h2>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--blab-text-secondary)]">{announcement.body}</p>
                  </ConsumerCard>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
