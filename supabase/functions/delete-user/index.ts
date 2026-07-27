import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

import { getBookImagePath } from "../_shared/book-image-storage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function listBookImagePaths(
  client: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const directories = [userId];
  const files: string[] = [];

  while (directories.length > 0) {
    const directory = directories.pop()!;
    let offset = 0;

    while (true) {
      const { data, error } = await client.storage
        .from("book-images")
        .list(directory, {
          limit: 100,
          offset,
          sortBy: { column: "name", order: "asc" },
        });
      if (error) throw error;

      for (const entry of data ?? []) {
        const path = `${directory}/${entry.name}`;
        if (entry.id == null) {
          directories.push(path);
        } else {
          files.push(path);
        }
      }

      if ((data?.length ?? 0) < 100) break;
      offset += data!.length;
    }
  }

  return files;
}

async function removeBookImagePaths(
  client: SupabaseClient,
  paths: string[],
): Promise<void> {
  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await client.storage
      .from("book-images")
      .remove(paths.slice(index, index + 100));
    if (error) throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: bookImages, error: imageQueryError } = await adminClient
      .from("book_images")
      .select("image_url")
      .eq("user_id", user.id);

    if (imageQueryError) throw imageQueryError;

    const referencedBookImagePaths = (bookImages ?? [])
      .map((row) => row.image_url)
      .filter((url): url is string => typeof url === "string")
      .map(getBookImagePath)
      .filter((path): path is string => path !== null);
    const ownedBookImagePaths = await listBookImagePaths(adminClient, user.id);
    const bookImagePaths = [
      ...new Set([...referencedBookImagePaths, ...ownedBookImagePaths]),
    ];

    if (bookImagePaths.length > 0) {
      await removeBookImagePaths(adminClient, bookImagePaths);
    }

    const { error: avatarStorageError } = await adminClient.storage
      .from("avatars")
      .remove([`${user.id}/avatar.png`]);
    if (avatarStorageError) throw avatarStorageError;

    const userTables = [
      "reading_sessions",
      "reading_progress_history",
      "book_images",
      "note_structures",
      "reading_content_embeddings",
      "recall_search_history",
      "book_recommendations",
      "reading_insights_memory",
      "reading_insights_rate_limit",
      "reading_goals",
      "ai_recall_usage",
      "subscription_events",
      "fcm_tokens",
      "push_logs",
    ];

    for (const table of userTables) {
      const { error } = await adminClient
        .from(table)
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
    }

    const { error: booksError } = await adminClient
      .from("books")
      .delete()
      .eq("user_id", user.id);
    if (booksError) throw booksError;

    const { error: profileError } = await adminClient
      .from("users")
      .delete()
      .eq("id", user.id);
    if (profileError) throw profileError;

    const { error: authDeleteError } = await adminClient.auth.admin
      .deleteUser(user.id);
    if (authDeleteError) throw authDeleteError;

    return jsonResponse({ success: true }, 200);
  } catch {
    console.error("Account deletion failed");
    return jsonResponse({ error: "Failed to delete account" }, 500);
  }
});
