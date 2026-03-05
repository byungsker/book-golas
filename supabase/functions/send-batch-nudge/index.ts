import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

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
    ["sign"]
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
  data?: Record<string, string>
): Promise<any> {
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

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
        payload: {
          aps: { sound: "default", badge: 1 },
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

async function loadPushTemplates(supabaseClient: any): Promise<Map<string, TemplateRow>> {
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
  locale: string
): { title: string; bodyTemplate: string } {
  if (locale === "en" && template.title_en && template.body_template_en) {
    return { title: template.title_en, bodyTemplate: template.body_template_en };
  }
  return { title: template.title, bodyTemplate: template.body_template };
}

function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}

async function sendToTargets(
  accessToken: string,
  projectId: string,
  targets: PushTarget[],
  templateType: string,
  variables: Record<string, string>,
  templates: Map<string, TemplateRow>,
  supabaseClient: any,
  extraData?: Record<string, string>
): Promise<{ sent: number; failed: number }> {
  const template = templates.get(templateType);
  if (!template) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  const invalidTokens: string[] = [];

  for (const target of targets) {
    try {
      const { title, bodyTemplate } = getLocalizedTemplate(template, target.locale);
      const body = replaceTemplateVariables(bodyTemplate, variables);

      await sendFCMMessage(accessToken, projectId, target.token, title, body, {
        type: templateType,
        ...extraData,
      });

      await supabaseClient.from("push_logs").insert({
        user_id: target.userId,
        push_type: templateType,
        book_id: extraData?.bookId || null,
        title: title,
        body: body,
      });

      sent++;
    } catch (error: any) {
      const msg = error?.message || "";
      if (msg.includes("UNREGISTERED") || msg.includes("INVALID_ARGUMENT")) {
        invalidTokens.push(target.token);
      }
      failed++;
    }
  }

  if (invalidTokens.length > 0) {
    await supabaseClient.from("fcm_tokens").delete().in("token", invalidTokens);
    console.log(`Removed ${invalidTokens.length} invalid tokens`);
  }

  return { sent, failed };
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

    if (!FIREBASE_SERVICE_ACCOUNT) {
      return new Response(
        JSON.stringify({ error: "FIREBASE_SERVICE_ACCOUNT not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    let serviceAccount: ServiceAccount;
    try {
      serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid FIREBASE_SERVICE_ACCOUNT format" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
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
      }
    );

    const now = new Date();
    const kstHour = (now.getUTCHours() + 9) % 24;
    const kstMinute = now.getUTCMinutes() < 30 ? 0 : 30;
    console.log(`Current KST slot: ${kstHour}:${kstMinute === 0 ? "00" : "30"}`);

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
      const userIds = [...new Set(dailyReminderUsers.map((u: any) => u.user_id))];

      const { data: books } = await supabaseClient
        .from("books")
        .select("user_id, title, status")
        .in("user_id", userIds)
        .eq("status", "reading")
        .order("updated_at", { ascending: false });

      const userBookMap = new Map<string, string>();
      if (books) {
        books.forEach((b: any) => {
          if (!userBookMap.has(b.user_id)) {
            userBookMap.set(b.user_id, b.title);
          }
        });
      }

      for (const user of dailyReminderUsers) {
        const bookTitle = userBookMap.get(user.user_id) || "";
        const variables: Record<string, string> = { bookTitle };

        const result = await sendToTargets(
          accessToken,
          serviceAccount.project_id,
          [{ userId: user.user_id, token: user.token, locale: user.locale || "ko" }],
          "daily_reminder",
          variables,
          templates,
          supabaseClient,
          {}
        );
        totalSent += result.sent;
        totalFailed += result.failed;
      }
      console.log(`daily_reminder: ${dailyReminderUsers.length} targets`);
    }

    // ── Phase 1: goal_alarm ──
    const { data: goalAlarmUsers } = await supabaseClient
      .from("fcm_tokens")
      .select("user_id, token, locale")
      .eq("notification_enabled", true)
      .eq("goal_alarm_enabled", true)
      .eq("goal_alarm_hour", kstHour)
      .eq("goal_alarm_minute", kstMinute);

    if (goalAlarmUsers && goalAlarmUsers.length > 0) {
      const userIds = [...new Set(goalAlarmUsers.map((u: any) => u.user_id))];

      const { data: books } = await supabaseClient
        .from("books")
        .select("user_id, id, title, current_page, total_pages, target_date, status")
        .in("user_id", userIds)
        .eq("status", "reading")
        .not("target_date", "is", null)
        .order("target_date", { ascending: true });

      const userGoalMap = new Map<string, any>();
      if (books) {
        books.forEach((b: any) => {
          if (!userGoalMap.has(b.user_id)) {
            userGoalMap.set(b.user_id, b);
          }
        });
      }

      for (const user of goalAlarmUsers) {
        const book = userGoalMap.get(user.user_id);
        if (!book) {
          totalSkipped++;
          continue;
        }

        const daysLeft = Math.max(
          0,
          Math.ceil(
            (new Date(book.target_date).getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );
        const remainingPages = Math.max(0, book.total_pages - book.current_page);
        const targetPages = daysLeft > 0 ? Math.ceil(remainingPages / daysLeft) : remainingPages;

        let templateType = "goal_alarm";
        const variables: Record<string, string> = {
          bookTitle: book.title,
          targetPages: String(targetPages),
          daysLeft: String(daysLeft),
          percent: String(
            book.total_pages > 0
              ? Math.round((book.current_page / book.total_pages) * 100)
              : 0
          ),
        };

        if (daysLeft === 0 || !book.target_date) {
          templateType = "daily_reminder";
          variables.bookTitle = book.title;
        }

        const result = await sendToTargets(
          accessToken,
          serviceAccount.project_id,
          [{ userId: user.user_id, token: user.token, locale: user.locale || "ko" }],
          templateType,
          variables,
          templates,
          supabaseClient,
          { bookId: book.id, bookTitle: book.title }
        );
        totalSent += result.sent;
        totalFailed += result.failed;
      }
      console.log(`goal_alarm: ${goalAlarmUsers.length} targets`);
    }

    // ── Phase 2: event nudge (batch SQL) ──
    const { data: eligibleNudges } = await supabaseClient.rpc(
      "get_eligible_event_nudges",
      {}
    ).catch(() => ({ data: null }));

    if (!eligibleNudges) {
      const nudgeResult = await processEventNudgesFallback(
        supabaseClient,
        accessToken,
        serviceAccount.project_id,
        templates,
        now
      );
      totalSent += nudgeResult.sent;
      totalFailed += nudgeResult.failed;
      totalSkipped += nudgeResult.skipped;
    } else {
      for (const nudge of eligibleNudges) {
        const { data: tokenData } = await supabaseClient
          .from("fcm_tokens")
          .select("token, locale")
          .eq("user_id", nudge.user_id)
          .eq("notification_enabled", true)
          .eq("event_nudge_enabled", true);

        if (!tokenData || tokenData.length === 0) {
          totalSkipped++;
          continue;
        }

        const targets: PushTarget[] = tokenData.map((t: any) => ({
          userId: nudge.user_id,
          token: t.token,
          locale: t.locale || "ko",
        }));

        const result = await sendToTargets(
          accessToken,
          serviceAccount.project_id,
          targets,
          nudge.nudge_type,
          nudge.variables || {},
          templates,
          supabaseClient,
          { bookId: nudge.book_id || "", bookTitle: nudge.variables?.bookTitle || "" }
        );
        totalSent += result.sent;
        totalFailed += result.failed;
      }
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
      }
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

async function processEventNudgesFallback(
  supabaseClient: any,
  accessToken: string,
  projectId: string,
  templates: Map<string, TemplateRow>,
  now: Date
): Promise<{ sent: number; failed: number; skipped: number }> {
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  const { data: nudgeUsers } = await supabaseClient
    .from("fcm_tokens")
    .select("user_id, token, locale")
    .eq("notification_enabled", true)
    .eq("event_nudge_enabled", true);

  if (!nudgeUsers || nudgeUsers.length === 0) return { sent, failed, skipped };

  const userTokensMap = new Map<string, PushTarget[]>();
  nudgeUsers.forEach((row: any) => {
    const targets = userTokensMap.get(row.user_id) || [];
    targets.push({ userId: row.user_id, token: row.token, locale: row.locale || "ko" });
    userTokensMap.set(row.user_id, targets);
  });

  const userIds = [...userTokensMap.keys()];

  const todayStr = now.toISOString().split("T")[0];
  const { data: todayLogs } = await supabaseClient
    .from("push_logs")
    .select("user_id, push_type")
    .in("user_id", userIds)
    .in("push_type", ["inactive", "deadline", "progress", "streak", "achievement"])
    .gte("created_at", `${todayStr}T00:00:00`);

  const sentToday = new Set<string>();
  if (todayLogs) {
    todayLogs.forEach((log: any) => {
      sentToday.add(`${log.user_id}:${log.push_type}`);
    });
  }

  const { data: books } = await supabaseClient
    .from("books")
    .select("user_id, id, title, current_page, total_pages, target_date, updated_at, status")
    .in("user_id", userIds)
    .order("updated_at", { ascending: false });

  if (!books || books.length === 0) return { sent, failed, skipped };

  const userBooksMap = new Map<string, any[]>();
  books.forEach((b: any) => {
    const list = userBooksMap.get(b.user_id) || [];
    list.push(b);
    userBooksMap.set(b.user_id, list);
  });

  for (const [userId, targets] of userTokensMap) {
    const userBooks = userBooksMap.get(userId);
    if (!userBooks || userBooks.length === 0) {
      skipped++;
      continue;
    }

    const currentBook = userBooks[0];
    const lastReadingDate = currentBook.updated_at ? new Date(currentBook.updated_at) : null;
    const daysSinceLastReading = lastReadingDate
      ? Math.floor((now.getTime() - lastReadingDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const progress =
      currentBook.total_pages > 0 ? currentBook.current_page / currentBook.total_pages : 0;
    const targetDate = currentBook.target_date ? new Date(currentBook.target_date) : null;
    const daysUntilDeadline = targetDate
      ? Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const readingDates = new Set<string>();
    userBooks.forEach((book: any) => {
      if (book.updated_at) {
        const date = new Date(book.updated_at);
        if (date >= sevenDaysAgo) {
          readingDates.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
        }
      }
    });
    const streak = readingDates.size;

    let nudgeType = "";
    let variables: Record<string, string> = {};

    if (daysSinceLastReading !== null && daysSinceLastReading >= 3) {
      nudgeType = "inactive";
      variables = { days: String(daysSinceLastReading), bookTitle: currentBook.title };
    } else if (progress >= 1.0 && currentBook.status === "reading") {
      nudgeType = "achievement";
      variables = { bookTitle: currentBook.title };
    } else if (daysUntilDeadline !== null && daysUntilDeadline > 0 && daysUntilDeadline <= 3) {
      nudgeType = "deadline";
      variables = { days: String(daysUntilDeadline), bookTitle: currentBook.title };
    } else if (progress >= 0.8 && progress < 1.0) {
      nudgeType = "progress";
      variables = { percent: String(Math.round(progress * 100)), bookTitle: currentBook.title };
    } else if (streak > 0 && streak < 7) {
      nudgeType = "streak";
      variables = { days: String(streak) };
    } else {
      skipped++;
      continue;
    }

    if (sentToday.has(`${userId}:${nudgeType}`)) {
      skipped++;
      continue;
    }

    const result = await sendToTargets(
      accessToken,
      projectId,
      targets,
      nudgeType,
      variables,
      templates,
      supabaseClient,
      { bookId: currentBook.id, bookTitle: currentBook.title }
    );
    sent += result.sent;
    failed += result.failed;
  }

  return { sent, failed, skipped };
}
