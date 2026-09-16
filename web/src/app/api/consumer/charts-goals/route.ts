import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { setChartsGoalsFixtureGoal } from "@/lib/consumer/charts-goals-fixtures";
import { getConsumerRouteFixture } from "@/lib/consumer/route-fixture";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  ReadingGoalUpdateRequestSchema,
  ReadingGoalUpdateSuccessSchema,
} from "@/lib/product/contracts";
import {
  consentRequiredError,
  conflictError,
  offlineError,
  quotaExceededError,
  unauthorizedError,
  unavailableError,
  validationError,
  type ProductError,
} from "@/lib/product/dal/errors";

function privateError(error: ProductError): NextResponse {
  const response = NextResponse.json({ error }, { status: error.status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function privateSuccess(input: { year: number; targetBooks: number; updatedAt: string }): NextResponse {
  const body = ReadingGoalUpdateSuccessSchema.parse({ kind: "goal_updated", ...input });
  const response = NextResponse.json(body, { status: 200 });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function fixtureError(fixture: string): ProductError | null {
  if (fixture === "charts-goals-unauthorized") return unauthorizedError();
  if (fixture === "charts-goals-offline") return offlineError("Reading statistics are offline.");
  if (fixture === "charts-goals-quota") return quotaExceededError("Reading statistics quota is unavailable.");
  if (fixture === "charts-goals-consent") return consentRequiredError("Reading statistics consent is required.");
  if (fixture === "charts-goals-network" || fixture === "charts-goals-error") return unavailableError("Reading statistics are temporarily unavailable.");
  return null;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return privateError(validationError());
  }

  const parsed = ReadingGoalUpdateRequestSchema.safeParse(body);
  if (!parsed.success) return privateError(validationError());

  const input = parsed.data;
  const fixture = getConsumerRouteFixture(request.cookies.get("bookgolas-route-fixture")?.value);
  if (fixture?.startsWith("charts-goals-")) {
    const error = fixtureError(fixture);
    if (error) return privateError(error);
    const result = setChartsGoalsFixtureGoal({ fixture, year: input.year, targetBooks: input.targetBooks });
    if (!result.ok) return privateError(result.error);
    const updatedAt = new Date().toISOString();
    revalidatePath(`/${input.locale}/stats`);
    return privateSuccess({ year: input.year, targetBooks: input.targetBooks, updatedAt });
  }

  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return privateError(unavailableError());
  }
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) return privateError(unavailableError());
  if (!user) return privateError(unauthorizedError());

  const now = new Date().toISOString();
  const existing = await supabase
    .from("reading_goals")
    .select("id")
    .eq("user_id", user.id)
    .eq("year", input.year)
    .maybeSingle();

  if (existing.error) return privateError(unavailableError());

  if (existing.data?.id) {
    const updated = await supabase
      .from("reading_goals")
      .update({ target_books: input.targetBooks, updated_at: now })
      .eq("id", existing.data.id)
      .eq("user_id", user.id)
      .eq("year", input.year);
    if (updated.error) return privateError(conflictError("The reading goal changed. Try again."));
  } else {
    const inserted = await supabase
      .from("reading_goals")
      .insert({ user_id: user.id, year: input.year, target_books: input.targetBooks, created_at: now, updated_at: now });
    if (inserted.error) return privateError(conflictError("The reading goal could not be saved."));
  }

  revalidatePath(`/${input.locale}/stats`);
  return privateSuccess({ year: input.year, targetBooks: input.targetBooks, updatedAt: now });
}
