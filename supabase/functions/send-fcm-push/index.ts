// Supabase Edge Function: FCM 푸시 알림 전송 (HTTP v1 API)
// Firebase 서비스 계정을 사용하여 FCM 푸시 알림을 전송합니다.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

// Firebase 서비스 계정 JSON (Supabase Secrets에 저장)
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");

interface FCMRequest {
  userId?: string;
  token?: string;
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

  // 캐시된 토큰이 유효하면 재사용
  if (cachedAccessToken && tokenExpiry > now + 60) {
    return cachedAccessToken;
  }

  // JWT 생성
  const privateKey = serviceAccount.private_key;

  // PEM 키를 CryptoKey로 변환
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

  // JWT 페이로드
  const jwtPayload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: getNumericDate(0),
    exp: getNumericDate(3600), // 1시간
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  // JWT 생성
  const jwt = await create({ alg: "RS256", typ: "JWT" }, jwtPayload, cryptoKey);

  // OAuth 2.0 토큰 교환
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
  data?: Record<string, string>,
): Promise<any> {
  const fcmUrl =
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const message = {
    message: {
      token: fcmToken,
      notification: {
        title,
        body,
      },
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
          aps: {
            sound: "default",
            badge: 1,
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

    // Firebase 서비스 계정 확인
    if (!FIREBASE_SERVICE_ACCOUNT) {
      return new Response(
        JSON.stringify({ error: "FIREBASE_SERVICE_ACCOUNT not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // 서비스 계정 파싱
    let serviceAccount: ServiceAccount;
    try {
      serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid FIREBASE_SERVICE_ACCOUNT format" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // 요청 본문 파싱
    const { userId, token, title, body, data }: FCMRequest = await req.json();

    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const bearerToken = authHeader?.replace(/^Bearer\s+/i, "") ?? "";
    const isServiceRole = serviceRoleKey.length > 0 &&
      bearerToken === serviceRoleKey;

    if (!isServiceRole) {
      const authClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader ?? "" } } },
      );
      const {
        data: { user },
        error: userError,
      } = await authClient.auth.getUser();

      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!userId || userId !== user.id || token) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
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
      },
    );

    let tokens: string[] = [];

    // userId가 제공된 경우, 해당 사용자의 모든 토큰 가져오기
    if (userId) {
      const { data: tokenData, error } = await supabaseClient
        .from("fcm_tokens")
        .select("token")
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching tokens:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to fetch tokens",
            details: error.message,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      tokens = tokenData?.map((t) => t.token) || [];
    } else if (token) {
      tokens = [token];
    } else {
      return new Response(
        JSON.stringify({ error: "Either userId or token must be provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (tokens.length === 0) {
      return new Response(JSON.stringify({ error: "No FCM tokens found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // OAuth 2.0 액세스 토큰 가져오기
    const accessToken = await getAccessToken(serviceAccount);

    // FCM 푸시 알림 전송
    const results = await Promise.allSettled(
      tokens.map((fcmToken) =>
        sendFCMMessage(
          accessToken,
          serviceAccount.project_id,
          fcmToken,
          title,
          body,
          data,
        )
      ),
    );

    // 결과 집계
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    // 실패한 토큰 제거 (무효한 토큰 정리)
    const failedTokens: string[] = [];
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        const error = (result as PromiseRejectedResult).reason?.message || "";
        // UNREGISTERED 또는 INVALID_ARGUMENT 에러인 경우 토큰 삭제
        if (
          error.includes("UNREGISTERED") ||
          error.includes("INVALID_ARGUMENT")
        ) {
          failedTokens.push(tokens[index]);
        }
      }
    });

    if (failedTokens.length > 0) {
      await supabaseClient
        .from("fcm_tokens")
        .delete()
        .in("token", failedTokens);
      console.log(`Removed ${failedTokens.length} invalid tokens`);
    }

    return new Response(
      JSON.stringify({
        success: true,
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
      },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
