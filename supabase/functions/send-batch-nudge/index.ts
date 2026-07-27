import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

import {
  buildDailyReminderDedupeKey,
  buildDailyReminderVariables,
  buildGoalAlarmDedupeKey,
  calculateReadingStreak,
  DailyReminderActivity,
  DailyReminderBook,
  getActivityKstDateString,
  getReadingActivityCutoff,
  selectDailyReminderBook,
} from "./daily-reminder.ts";
import {
  buildDeadlineDedupeKey,
  buildDeadlineReminderVariables,
  calculateDeadlineState,
  DeadlineReminderBook,
  getKstDateString,
  getKstDaysLeft,
  MAX_BOOKS_PER_SLOT,
  selectDeadlineReminderBooks,
  shouldSendDeadlineReminder,
} from "./deadline-reminder.ts";
import { buildEventNudgeDedupeKey, isEventNudgeWindow } from "./event-nudge.ts";

const FIREBASE_SERVICE_ACCOUNT = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

interface PushTarget {
  userId: string;
  token: string;
  locale: string;
}

interface TemplateRow {
  type: string;
  title: string;
  body_template: string;
  title_en: string | null;
  body_template_en: string | null;
}

let cachedAccessToken: string | null = null;
let tokenExpiry: number = 0;

async function hashSecret(secret: string): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)),
  );
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index++) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (cachedAccessToken && tokenExpiry > now + 60) {
    return cachedAccessToken;
  }

  const privateKey = serviceAccount.private_key;
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKey
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const jwtPayload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: getNumericDate(0),
    exp: getNumericDate(3600),
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  const jwt = await create({ alg: "RS256", typ: "JWT" }, jwtPayload, cryptoKey);

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  cachedAccessToken = tokenData.access_token;
  tokenExpiry = now + tokenData.expires_in;

  return cachedAccessToken!;
}

async function sendFCMMessage(
  accessToken: string,
  projectId: string,
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<any> {
  const fcmUrl =
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const message = {
    message: {
      token: fcmToken,
      notification: { title, body },
      data: data || {},
      android: {
        priority: "high",
        notification: {
          sound: "default",
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      apns: {
        headers: {
          "apns-collapse-id": `${data?.type || "reading"}:${
            data?.bookId || "general"
          }`.slice(
            0,
            64,
          ),
        },
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            "thread-id": "reading-reminders",
          },
        },
      },
    },
  };

  const response = await fetch(fcmUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FCM API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

let templatesCache: Map<string, TemplateRow> | null = null;

async function loadPushTemplates(
  supabaseClient: any,
): Promise<Map<string, TemplateRow>> {
  if (templatesCache) return templatesCache;

  const { data: templates } = await supabaseClient
    .from("push_templates")
    .select("type, title, body_template, title_en, body_template_en")
    .eq("is_active", true);

  templatesCache = new Map();
  if (templates) {
    templates.forEach((t: TemplateRow) => {
      templatesCache!.set(t.type, t);
    });
  }
  return templatesCache;
}

function getLocalizedTemplate(
  template: TemplateRow,
  locale: string,
): { title: string; bodyTemplate: string } {
  if (locale === "en" && template.title_en && template.body_template_en) {
    return {
      title: template.title_en,
      bodyTemplate: template.body_template_en,
    };
  }
  return { title: template.title, bodyTemplate: template.body_template };
}

function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}

const FCM_BATCH_SIZE = 100;

function stableTokenHash(token: string): string {
  let hash = 5381;
  for (let i = 0; i < token.length; i++) {
    hash = ((hash << 5) + hash + token.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

async function sendToTargets(
  accessToken: string,
  projectId: string,
  targets: PushTarget[],
  templateType: string,
  variables: Record<string, string>,
  templates: Map<string, TemplateRow>,
  supabaseClient: any,
  extraData?: Record<string, string>,
  dedupeKey?: string,
): Promise<{ sent: number; failed: number }> {
  const template = templates.get(templateType);
  if (!template) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  const invalidTokens: string[] = [];

  for (let i = 0; i < targets.length; i += FCM_BATCH_SIZE) {
    const batch = targets.slice(i, i + FCM_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (target) => {
        const { title, bodyTemplate } = getLocalizedTemplate(
          template,
          target.locale,
        );
        const resolvedTitle = replaceTemplateVariables(title, variables);
        const body = replaceTemplateVariables(bodyTemplate, variables);
        let reservedLogId: string | null = null;

        if (dedupeKey) {
          const { data: reservation, error: reservationError } =
            await supabaseClient
              .from("push_logs")
              .insert({
                user_id: target.userId,
                push_type: templateType,
                book_id: extraData?.bookId || null,
                title: resolvedTitle,
                body,
                sent_at: null,
                dedupe_key: dedupeKey,
              })
              .select("id")
              .single();

          if (reservationError) {
            const isDuplicate = reservationError.code === "23505" ||
              String(reservationError.message || "").includes(
                "duplicate key",
              );
            if (isDuplicate) {
              return { target, status: "skipped" as const };
            }
            throw reservationError;
          }

          reservedLogId = reservation?.id ?? null;
        }

        try {
          await sendFCMMessage(
            accessToken,
            projectId,
            target.token,
            resolvedTitle,
            body,
            {
              type: templateType,
              ...extraData,
            },
          );
        } catch (error) {
          if (reservedLogId) {
            const { error: releaseError } = await supabaseClient
              .from("push_logs")
              .delete()
              .eq("id", reservedLogId);
            if (releaseError) {
              console.error("Failed to release push dedupe reservation", {
                dedupeKey,
                releaseError,
              });
            }
          }
          throw error;
        }

        if (reservedLogId) {
          const { error: markSentError } = await supabaseClient
            .from("push_logs")
            .update({ sent_at: new Date().toISOString() })
            .eq("id", reservedLogId);
          if (markSentError) {
            throw markSentError;
          }
        } else {
          await supabaseClient.from("push_logs").insert({
            user_id: target.userId,
            push_type: templateType,
            book_id: extraData?.bookId || null,
            title: resolvedTitle,
            body,
            dedupe_key: null,
          });
        }

        return { target, status: "sent" as const };
      }),
    );

    results.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        if (result.value.status === "sent") sent++;
      } else {
        const msg = result.reason?.message || "";
        if (msg.includes("UNREGISTERED") || msg.includes("INVALID_ARGUMENT")) {
          invalidTokens.push(batch[idx].token);
        }
        failed++;
      }
    });
  }

  if (invalidTokens.length > 0) {
    await supabaseClient.from("fcm_tokens").delete().in("token", invalidTokens);
    console.log(`Removed ${invalidTokens.length} invalid tokens`);
  }

  return { sent, failed };
}

async function runInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>,
): Promise<{ results: R[]; errors: any[] }> {
  const results: R[] = [];
  const errors: any[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(fn));

    batchResults.forEach((r) => {
      if (r.status === "fulfilled") {
        results.push(r.value);
      } else {
        errors.push(r.reason);
        console.error("Batch error:", r.reason);
      }
    });
  }

  return { results, errors };
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
        },
      });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const bearerToken = req.headers.get("Authorization")
      ?.replace(/^Bearer\s+/i, "") ?? "";
    const isServiceRole = serviceRoleKey.length > 0 && timingSafeEqual(
      await hashSecret(bearerToken),
      await hashSecret(serviceRoleKey),
    );
    if (!isServiceRole) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!FIREBASE_SERVICE_ACCOUNT) {
      return new Response(
        JSON.stringify({ error: "FIREBASE_SERVICE_ACCOUNT not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    let serviceAccount: ServiceAccount;
    try {
      serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid FIREBASE_SERVICE_ACCOUNT format" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const now = new Date();
    const kstHour = (now.getUTCHours() + 9) % 24;
    const kstMinute = now.getUTCMinutes() < 30 ? 0 : 30;
    console.log(
      `Current KST slot: ${kstHour}:${kstMinute === 0 ? "00" : "30"}`,
    );

    const accessToken = await getAccessToken(serviceAccount);
    const templates = await loadPushTemplates(supabaseClient);

    let totalSent = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    // ── Phase 1: daily_reminder ──
    const { data: dailyReminderUsers } = await supabaseClient
      .from("fcm_tokens")
      .select("user_id, token, locale")
      .eq("notification_enabled", true)
      .eq("daily_reminder_enabled", true)
      .eq("daily_reminder_hour", kstHour)
      .eq("daily_reminder_minute", kstMinute);

    if (dailyReminderUsers && dailyReminderUsers.length > 0) {
      const userIds = [
        ...new Set(dailyReminderUsers.map((u: any) => u.user_id)),
      ];

      const { data: books } = await supabaseClient
        .from("books")
        .select(
          "user_id, id, title, current_page, total_pages, updated_at, status",
        )
        .in("user_id", userIds)
        .eq("status", "reading")
        .order("updated_at", { ascending: false });

      const userBooksMap = new Map<string, DailyReminderBook[]>();
      if (books) {
        books.forEach((book: DailyReminderBook) => {
          const list = userBooksMap.get(book.user_id) || [];
          list.push(book);
          userBooksMap.set(book.user_id, list);
        });
      }

      const { data: readingActivities } = await supabaseClient
        .from("reading_progress_history")
        .select("user_id, book_id, created_at")
        .in("user_id", userIds)
        .gte("created_at", getReadingActivityCutoff(now))
        .order("created_at", { ascending: false });

      const userActivitiesMap = new Map<string, DailyReminderActivity[]>();
      if (readingActivities) {
        readingActivities.forEach((activity: DailyReminderActivity) => {
          const list = userActivitiesMap.get(activity.user_id) || [];
          list.push(activity);
          userActivitiesMap.set(activity.user_id, list);
        });
      }

      const kstDate = getKstDateString(now);
      const dailyResults = await runInBatches(
        dailyReminderUsers,
        FCM_BATCH_SIZE,
        async (user: any) => {
          const book = selectDailyReminderBook(
            userBooksMap.get(user.user_id) || [],
            userActivitiesMap.get(user.user_id) || [],
          );
          if (!book) {
            totalSkipped++;
            return { sent: 0, failed: 0 };
          }

          const variables = buildDailyReminderVariables(book);
          return await sendToTargets(
            accessToken,
            serviceAccount.project_id,
            [{
              userId: user.user_id,
              token: user.token,
              locale: user.locale || "ko",
            }],
            "daily_reminder",
            variables,
            templates,
            supabaseClient,
            {
              bookId: book.id,
              bookTitle: book.title,
              percent: variables.percent,
              destination: "reading",
            },
            buildDailyReminderDedupeKey({
              kstDate,
              userId: user.user_id,
              tokenHash: stableTokenHash(user.token),
            }),
          );
        },
      );
      dailyResults.results.forEach((r) => {
        totalSent += r.sent;
        totalFailed += r.failed;
      });
      console.log(
        `daily_reminder: ${dailyReminderUsers.length} targets, sent=${totalSent}, failed=${totalFailed}`,
      );
    }

    // ── Phase 1: deadline escalation / goal_alarm ──
    const { data: goalAlarmUsers } = await supabaseClient
      .from("fcm_tokens")
      .select("user_id, token, locale, goal_alarm_hour, goal_alarm_minute")
      .eq("notification_enabled", true)
      .eq("goal_alarm_enabled", true);

    if (goalAlarmUsers && goalAlarmUsers.length > 0) {
      const userIds = [...new Set(goalAlarmUsers.map((u: any) => u.user_id))];
      const kstDate = getKstDateString(now);

      const { data: sentDeadlineLogs } = await supabaseClient
        .from("push_logs")
        .select("dedupe_key")
        .in("user_id", userIds)
        .like("dedupe_key", `deadline:${kstDate}:%`);

      const sentDeadlineKeys = new Set<string>();
      if (sentDeadlineLogs) {
        sentDeadlineLogs.forEach((log: any) => {
          if (log.dedupe_key) sentDeadlineKeys.add(log.dedupe_key);
        });
      }

      const { data: books } = await supabaseClient
        .from("books")
        .select(
          "user_id, id, title, current_page, total_pages, target_date, updated_at, status",
        )
        .in("user_id", userIds)
        .eq("status", "reading")
        .not("target_date", "is", null)
        .order("target_date", { ascending: true });

      const userBooksMap = new Map<string, DeadlineReminderBook[]>();
      if (books) {
        books.forEach((book: DeadlineReminderBook) => {
          const list = userBooksMap.get(book.user_id) || [];
          list.push(book);
          userBooksMap.set(book.user_id, list);
        });
      }

      const goalResults = await runInBatches(
        goalAlarmUsers,
        FCM_BATCH_SIZE,
        async (user: any) => {
          const userBooks = userBooksMap.get(user.user_id) || [];
          const deadlineBooks = selectDeadlineReminderBooks(userBooks, now);
          const results: { sent: number; failed: number }[] = [];
          let currentSlotCandidateCount = 0;
          let hasCurrentSlotDeadlineCandidate = false;

          for (const book of deadlineBooks) {
            const state = calculateDeadlineState(book, now);
            if (!state) continue;

            const slotProbe = shouldSendDeadlineReminder({
              stage: state.stage,
              kstHour,
              kstMinute,
              goalHour: user.goal_alarm_hour ?? 20,
              goalMinute: user.goal_alarm_minute ?? 0,
              dedupeKey: "",
              sentKeys: new Set(),
            });
            if (!slotProbe.shouldSend || !slotProbe.slotLabel) continue;
            hasCurrentSlotDeadlineCandidate = true;
            currentSlotCandidateCount++;
            if (currentSlotCandidateCount > MAX_BOOKS_PER_SLOT) break;

            const baseDedupeKey = buildDeadlineDedupeKey({
              kstDate,
              userId: user.user_id,
              bookId: book.id,
              stage: state.stage,
              slotLabel: slotProbe.slotLabel,
            });
            const dedupeKey = `${baseDedupeKey}:${stableTokenHash(user.token)}`;

            const decision = shouldSendDeadlineReminder({
              stage: state.stage,
              kstHour,
              kstMinute,
              goalHour: user.goal_alarm_hour ?? 20,
              goalMinute: user.goal_alarm_minute ?? 0,
              dedupeKey,
              sentKeys: sentDeadlineKeys,
            });
            if (!decision.shouldSend) {
              totalSkipped++;
              continue;
            }

            const variables = buildDeadlineReminderVariables(state);
            const result = await sendToTargets(
              accessToken,
              serviceAccount.project_id,
              [{
                userId: user.user_id,
                token: user.token,
                locale: user.locale || "ko",
              }],
              state.stage,
              variables,
              templates,
              supabaseClient,
              {
                bookId: book.id,
                bookTitle: book.title,
                stage: state.stage,
                daysLeft: String(state.daysLeft),
                remainingPages: variables.remainingPages,
                targetPages: variables.targetPages,
                percent: variables.percent,
              },
              dedupeKey,
            );
            sentDeadlineKeys.add(dedupeKey);
            results.push(result);
          }

          if (results.length > 0) {
            return results.reduce(
              (acc, result) => ({
                sent: acc.sent + result.sent,
                failed: acc.failed + result.failed,
              }),
              { sent: 0, failed: 0 },
            );
          }

          if (hasCurrentSlotDeadlineCandidate) {
            totalSkipped++;
            return { sent: 0, failed: 0 };
          }

          const fallbackBook = userBooks
            .filter((book) => {
              if (book.status !== "reading") return false;
              if (!book.target_date) return false;
              if (!book.total_pages || book.total_pages <= 0) return false;
              if (Math.max(0, book.current_page ?? 0) >= book.total_pages) {
                return false;
              }
              return getKstDaysLeft(now, book.target_date) > 7;
            })
            .sort((a, b) =>
              getKstDaysLeft(now, a.target_date!) -
              getKstDaysLeft(now, b.target_date!)
            )[0];

          if (
            !fallbackBook || kstHour !== (user.goal_alarm_hour ?? 20) ||
            kstMinute !== (user.goal_alarm_minute ?? 0)
          ) {
            totalSkipped++;
            return { sent: 0, failed: 0 };
          }

          const remainingPages = Math.max(
            0,
            (fallbackBook.total_pages ?? 0) - (fallbackBook.current_page ?? 0),
          );
          const fallbackDaysLeft = fallbackBook.target_date
            ? Math.max(1, getKstDaysLeft(now, fallbackBook.target_date))
            : 1;
          const targetPages = Math.ceil(remainingPages / fallbackDaysLeft);
          const variables: Record<string, string> = {
            bookTitle: fallbackBook.title,
            targetPages: String(targetPages),
            daysLeft: String(fallbackDaysLeft),
            percent: String(
              fallbackBook.total_pages && fallbackBook.total_pages > 0
                ? Math.round(
                  ((fallbackBook.current_page ?? 0) /
                    fallbackBook.total_pages) * 100,
                )
                : 0,
            ),
          };

          return sendToTargets(
            accessToken,
            serviceAccount.project_id,
            [{
              userId: user.user_id,
              token: user.token,
              locale: user.locale || "ko",
            }],
            "goal_alarm",
            variables,
            templates,
            supabaseClient,
            {
              bookId: fallbackBook.id,
              bookTitle: fallbackBook.title,
              destination: "reading",
            },
            buildGoalAlarmDedupeKey({
              kstDate,
              userId: user.user_id,
              bookId: fallbackBook.id,
              tokenHash: stableTokenHash(user.token),
            }),
          );
        },
      );
      goalResults.results.forEach((r) => {
        totalSent += r.sent;
        totalFailed += r.failed;
      });
      console.log(
        `deadline/goal_alarm: ${goalAlarmUsers.length} targets, sent=${totalSent}, failed=${totalFailed}`,
      );
    }

    if (isEventNudgeWindow(kstHour, kstMinute)) {
      const nudgeResult = await processEventNudges(
        supabaseClient,
        accessToken,
        serviceAccount.project_id,
        templates,
        now,
      );
      totalSent += nudgeResult.sent;
      totalFailed += nudgeResult.failed;
      totalSkipped += nudgeResult.skipped;
    }

    return new Response(
      JSON.stringify({
        success: true,
        currentSlotKST: `${kstHour}:${kstMinute === 0 ? "00" : "30"}`,
        summary: {
          sent: totalSent,
          skipped: totalSkipped,
          failed: totalFailed,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});

async function processEventNudges(
  supabaseClient: any,
  accessToken: string,
  projectId: string,
  templates: Map<string, TemplateRow>,
  now: Date,
): Promise<{ sent: number; failed: number; skipped: number }> {
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  const { data: nudgeUsers } = await supabaseClient
    .from("fcm_tokens")
    .select("user_id, token, locale")
    .eq("notification_enabled", true)
    .eq("event_nudge_enabled", true)
    .eq("daily_reminder_enabled", false);

  if (!nudgeUsers || nudgeUsers.length === 0) return { sent, failed, skipped };

  const userTokensMap = new Map<string, PushTarget[]>();
  nudgeUsers.forEach((row: any) => {
    const targets = userTokensMap.get(row.user_id) || [];
    targets.push({
      userId: row.user_id,
      token: row.token,
      locale: row.locale || "ko",
    });
    userTokensMap.set(row.user_id, targets);
  });

  const userIds = [...userTokensMap.keys()];

  const { data: books } = await supabaseClient
    .from("books")
    .select(
      "user_id, id, title, current_page, total_pages, target_date, updated_at, status",
    )
    .in("user_id", userIds)
    .eq("status", "reading")
    .order("updated_at", { ascending: false });

  if (!books || books.length === 0) return { sent, failed, skipped };

  const userBooksMap = new Map<string, any[]>();
  books.forEach((b: any) => {
    const list = userBooksMap.get(b.user_id) || [];
    list.push(b);
    userBooksMap.set(b.user_id, list);
  });

  const { data: readingActivities } = await supabaseClient
    .from("reading_progress_history")
    .select("user_id, book_id, created_at")
    .in("user_id", userIds)
    .gte("created_at", getReadingActivityCutoff(now))
    .order("created_at", { ascending: false });

  const userActivitiesMap = new Map<string, DailyReminderActivity[]>();
  if (readingActivities) {
    readingActivities.forEach((activity: DailyReminderActivity) => {
      const list = userActivitiesMap.get(activity.user_id) || [];
      list.push(activity);
      userActivitiesMap.set(activity.user_id, list);
    });
  }

  const kstDate = getKstDateString(now);
  const userEntries = [...userTokensMap.entries()];
  const fallbackResults = await runInBatches(
    userEntries,
    FCM_BATCH_SIZE,
    async ([userId, targets]: [string, PushTarget[]]) => {
      const userBooks = userBooksMap.get(userId) || [];
      const userActivities = userActivitiesMap.get(userId) || [];
      const currentBook = selectDailyReminderBook(userBooks, userActivities);
      if (!currentBook) {
        return { sent: 0, failed: 0, skipped: 1 };
      }

      const currentBookActivities = userActivities.filter(
        (activity) => activity.book_id === currentBook.id,
      );
      const latestActivity = currentBookActivities.find(
        (activity) => activity.created_at !== null,
      );
      const lastReadingDate = latestActivity?.created_at
        ? new Date(latestActivity.created_at)
        : null;
      const daysSinceLastReading = lastReadingDate
        ? Math.floor(
          (now.getTime() - lastReadingDate.getTime()) / (1000 * 60 * 60 * 24),
        )
        : null;

      const totalPages = currentBook.total_pages ?? 0;
      const currentPage = currentBook.current_page ?? 0;
      const progress = totalPages > 0 ? currentPage / totalPages : 0;
      const targetDate = currentBook.target_date
        ? new Date(currentBook.target_date)
        : null;
      const daysUntilDeadline = targetDate
        ? Math.ceil(
          (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        )
        : null;

      const hasReadToday = userActivities.some((activity) =>
        activity.created_at &&
        getActivityKstDateString(activity.created_at) === kstDate
      );
      if (hasReadToday) {
        return { sent: 0, failed: 0, skipped: 1 };
      }
      const streak = calculateReadingStreak(userActivities, now);

      let nudgeType = "";
      let variables: Record<string, string> = {};

      if (daysSinceLastReading !== null && daysSinceLastReading >= 3) {
        nudgeType = "inactive";
        variables = {
          days: String(daysSinceLastReading),
          bookTitle: currentBook.title,
        };
      } else if (progress >= 1.0 && currentBook.status === "reading") {
        nudgeType = "achievement";
        variables = { bookTitle: currentBook.title };
      } else if (
        daysUntilDeadline !== null && daysUntilDeadline > 0 &&
        daysUntilDeadline <= 3
      ) {
        nudgeType = "deadline";
        variables = {
          days: String(daysUntilDeadline),
          bookTitle: currentBook.title,
        };
      } else if (progress >= 0.8 && progress < 1.0) {
        nudgeType = "progress";
        variables = {
          percent: String(Math.round(progress * 100)),
          bookTitle: currentBook.title,
        };
      } else if (streak > 0 && streak < 7) {
        nudgeType = "streak";
        variables = {
          days: String(streak),
          bookTitle: currentBook.title,
        };
      } else {
        return { sent: 0, failed: 0, skipped: 1 };
      }

      const uniqueTargets = [
        ...new Map(targets.map((target) => [target.token, target])).values(),
      ];
      const targetResults = await runInBatches(
        uniqueTargets,
        FCM_BATCH_SIZE,
        (target) =>
          sendToTargets(
            accessToken,
            projectId,
            [target],
            nudgeType,
            variables,
            templates,
            supabaseClient,
            {
              bookId: currentBook.id,
              bookTitle: currentBook.title,
              destination: "reading",
            },
            buildEventNudgeDedupeKey({
              kstDate,
              userId,
              tokenHash: stableTokenHash(target.token),
            }),
          ),
      );
      const result = targetResults.results.reduce(
        (summary, targetResult) => ({
          sent: summary.sent + targetResult.sent,
          failed: summary.failed + targetResult.failed,
        }),
        { sent: 0, failed: targetResults.errors.length },
      );
      return { sent: result.sent, failed: result.failed, skipped: 0 };
    },
  );

  fallbackResults.results.forEach((r) => {
    sent += r.sent;
    failed += r.failed;
    skipped += r.skipped;
  });

  return { sent, failed, skipped };
}
