import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/shared/api/supabase/index.server";
import { getConsumerRouteFixture } from "@/shared/config";

export type ConsumerAuthContext = {
  supabase: SupabaseClient | null;
  user: User | null;
  unavailable: boolean;
};

export async function getConsumerAuthContext(): Promise<ConsumerAuthContext> {
  let routeFixture = null;
  try {
    routeFixture = getConsumerRouteFixture(
      (await cookies()).get("bookgolas-route-fixture")?.value,
    );
  } catch {
    routeFixture = null;
  }
  if (routeFixture === "anonymous" || routeFixture === "expired-session") {
    return { supabase: null, user: null, unavailable: false };
  }
  if (routeFixture === "unavailable") {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: true,
    };
  }
  if (routeFixture === "bootstrap-network") {
    return { supabase: null, user: null, unavailable: true };
  }
  if ([
    "authenticated-not-found",
    "deleted-book",
    "home-book-list",
    "home-empty-completed",
    "home-empty-paused",
    "home-empty-planned",
    "home-empty-reading",
    "unauthorized-private-data",
    "pending",
  ].includes(routeFixture ?? "")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("library-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("book-discovery-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("book-lifecycle-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("book-detail-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("progress-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("calendar-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("charts-goals-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("ai-artifacts-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("account-settings-") || routeFixture?.startsWith("account-deletion-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("announcements-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("export-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("web-push-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-0000-0000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("ai-consent-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("recall-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("timer-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("notes-highlights-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("images-ocr-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  if (routeFixture?.startsWith("review-share-")) {
    return {
      supabase: null,
      user: { id: "00000000-0000-4000-8000-000000000001" } as User,
      unavailable: false,
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    return {
      supabase,
      user: error ? null : user,
      unavailable: Boolean(error),
    };
  } catch {
    return { supabase: null, user: null, unavailable: true };
  }
}

export async function getCurrentConsumerUser(): Promise<{
  user: User | null;
  unavailable: boolean;
}> {
  const context = await getConsumerAuthContext();
  return { user: context.user, unavailable: context.unavailable };
}
