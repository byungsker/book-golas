// Supabase Edge Function: 개인 데이터 기반 스마트 넛지 푸시 알림 (HTTP v1 API)
// 사용자의 독서 상태를 분석하여 맞춤형 넛지 알림을 전송합니다.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const FIREBASE_SERVICE_ACCOUNT = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");

interface NudgeAnalysis {
  type: "inactive" | "progress" | "streak" | "deadline" | "achievement";
  title: string;
  body: string;
  data?: Record<string, string>;
}

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

// OAuth 2.0 액세스 토큰 캐시
let cachedAccessToken: string | null = null;
let tokenExpiry: number = 0;

// 서비스 계정으로 OAuth 2.0 액세스 토큰 생성
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

// FCM v1 API로 푸시 전송
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

function getNudgeCategoryEnabled(
  nudgeType: string,
  prefs: { dailyReminder: boolean; goalAchievement: boolean; announcements: boolean }
): boolean {
  switch (nudgeType) {
    case "inactive":
    case "streak":
      return prefs.dailyReminder;
    case "progress":
    case "deadline":
    case "achievement":
      return prefs.goalAchievement;
    default:
      return true;
  }
}

serve(async (req) => {
  try {
    // CORS 헤더 설정
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

    // Supabase 클라이언트 생성
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

    // 요청 본문 파싱
    const { userId, forceType } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 사용자의 FCM 토큰 가져오기
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from("fcm_tokens")
      .select("token, daily_reminder_enabled, goal_achievement_enabled, announcements_enabled")
      .eq("user_id", userId);

    if (tokenError || !tokenData || tokenData.length === 0) {
      return new Response(
        JSON.stringify({ error: "No FCM tokens found for user" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const categoryPrefs = {
      dailyReminder: tokenData[0].daily_reminder_enabled ?? true,
      goalAchievement: tokenData[0].goal_achievement_enabled ?? true,
      announcements: tokenData[0].announcements_enabled ?? true,
    };

    // 사용자의 독서 데이터 분석
    const nudge = await analyzeUserReadingState(
      supabaseClient,
      userId,
      forceType
    );

    if (!nudge) {
      return new Response(
        JSON.stringify({ message: "No nudge needed for this user" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const categoryEnabled = getNudgeCategoryEnabled(nudge.type, categoryPrefs);
    if (!categoryEnabled) {
      return new Response(
        JSON.stringify({
          success: true,
          nudgeType: nudge.type,
          skipped: true,
          reason: `Category disabled for nudge type: ${nudge.type}`,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // OAuth 2.0 액세스 토큰 가져오기
    const accessToken = await getAccessToken(serviceAccount);

    // FCM 푸시 알림 전송
    const tokens = tokenData.map((t) => t.token);
    const results = await Promise.allSettled(
      tokens.map((fcmToken) =>
        sendFCMMessage(
          accessToken,
          serviceAccount.project_id,
          fcmToken,
          nudge.title,
          nudge.body,
          {
            type: "smart_nudge",
            nudgeType: nudge.type,
            ...nudge.data,
          }
        )
      )
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({
        success: true,
        nudgeType: nudge.type,
        sent: successful,
        failed,
        total: tokens.length,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
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

// 사용자의 독서 상태를 분석하여 맞춤형 넛지 생성
async function analyzeUserReadingState(
  supabaseClient: any,
  userId: string,
  forceType?: string
): Promise<NudgeAnalysis | null> {
  const now = new Date();

  // 1. 사용자의 활성 책 목록 가져오기
  const { data: books, error: booksError } = await supabaseClient
    .from("books")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (booksError || !books || books.length === 0) {
    return null;
  }

  // 2. 마지막 독서 시간 확인
  const lastBook = books[0];
  const lastReadingDate = lastBook.updated_at
    ? new Date(lastBook.updated_at)
    : null;
  const daysSinceLastReading = lastReadingDate
    ? Math.floor(
        (now.getTime() - lastReadingDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  // 3. 가장 최근 책 정보
  const currentBook = books[0];
  const progress =
    currentBook.total_pages > 0
      ? currentBook.current_page / currentBook.total_pages
      : 0;
  const targetDate = currentBook.target_date
    ? new Date(currentBook.target_date)
    : null;
  const daysUntilDeadline = targetDate
    ? Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // 4. 독서 연속일 계산
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const readingDates = new Set<string>();
  books.forEach((book: any) => {
    if (book.updated_at) {
      const date = new Date(book.updated_at);
      if (date >= sevenDaysAgo) {
        readingDates.add(
          `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        );
      }
    }
  });
  const streak = readingDates.size;

  // 5. 넛지 타입 결정
  let nudgeType: string = forceType || "";

  if (!nudgeType) {
    if (daysSinceLastReading !== null && daysSinceLastReading >= 3) {
      nudgeType = "inactive";
    } else if (
      daysUntilDeadline !== null &&
      daysUntilDeadline > 0 &&
      daysUntilDeadline <= 3
    ) {
      nudgeType = "deadline";
    } else if (progress >= 0.8 && progress < 1.0) {
      nudgeType = "progress";
    } else if (streak > 0 && streak < 7) {
      nudgeType = "streak";
    } else {
      return null;
    }
  }

  // 6. 맞춤형 메시지 생성
  let title = "";
  let body = "";
  let data: Record<string, string> = {};

  switch (nudgeType) {
    case "inactive":
      title = "독서를 잊지 마세요! 📚";
      body = `${daysSinceLastReading}일째 독서를 안 했네요. 다시 시작해볼까요?`;
      data = {
        bookId: currentBook.id,
        bookTitle: currentBook.title,
        daysInactive: String(daysSinceLastReading),
      };
      break;

    case "deadline":
      title = "목표 완료까지 얼마 안 남았어요! ⏰";
      body = `"${currentBook.title}" 완독까지 ${daysUntilDeadline}일 남았습니다.`;
      data = {
        bookId: currentBook.id,
        bookTitle: currentBook.title,
        daysRemaining: String(daysUntilDeadline),
      };
      break;

    case "progress":
      const progressPercent = Math.round(progress * 100);
      title = "목표 달성까지 조금만 더! 🎯";
      body = `"${currentBook.title}" ${progressPercent}% 완독했습니다. 조금만 더 화이팅!`;
      data = {
        bookId: currentBook.id,
        bookTitle: currentBook.title,
        progress: String(progressPercent),
      };
      break;

    case "streak":
      title = "독서 연속일을 이어가세요! 🔥";
      body = `독서 연속일이 ${streak}일입니다! 오늘도 읽어볼까요?`;
      data = {
        streak: String(streak),
      };
      break;

    case "achievement":
      title = "목표를 달성했어요! 🎉";
      body = `"${currentBook.title}" 완독을 축하합니다!`;
      data = {
        bookId: currentBook.id,
        bookTitle: currentBook.title,
      };
      break;

    default:
      return null;
  }

  return {
    type: nudgeType as any,
    title,
    body,
    data,
  };
}








