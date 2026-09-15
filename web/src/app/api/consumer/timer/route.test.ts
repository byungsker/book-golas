import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { POST } from "./route";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/product/dal", () => ({
  bookDtoSelect: "id",
  mapDatabaseError: vi.fn(),
  parseBookRow: vi.fn(),
  resolveProductSession: vi.fn(),
}));

const bookId = "00000000-0000-4000-8000-000000004361";

function request(body: unknown, fixture: string) {
  return new NextRequest("http://localhost/api/consumer/timer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `bookgolas-route-fixture=${fixture}`,
    },
    body: JSON.stringify(body),
  });
}

function input(id: string, durationSeconds = 1_200) {
  return {
    action: "finish" as const,
    locale: "en" as const,
    bookId,
    startedAt: "2026-09-16T00:00:00.000Z",
    endedAt: "2026-09-16T00:20:00.000Z",
    durationSeconds,
    idempotencyKey: id,
  };
}

describe("/api/consumer/timer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BOOKGOLAS_ROUTE_TEST_MODE = "enabled";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54329";
  });

  it("saves an owned session, returns the updated total and invalidates private views", async () => {
    const response = await POST(request(input("00000000-0000-4000-8000-000000005371"), "timer-happy"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      kind: "saved",
      duplicate: false,
      totalReadingSeconds: 4_800,
      session: { durationSeconds: 1_200, bookId },
      invalidatedPaths: ["/en/home", "/en/library", "/en/stats", `/en/books/${bookId}`, `/en/reading/${bookId}`],
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(revalidatePath).toHaveBeenCalledWith(`/en/stats`);
  });

  it("discards sessions below thirty seconds and caps sessions above eight hours", async () => {
    const minimum = await POST(request(input("00000000-0000-4000-8000-000000005372", 29), "timer-minimum"));
    expect(minimum.status).toBe(200);
    expect(await minimum.json()).toMatchObject({ kind: "discarded", session: null, reason: "minimum", totalReadingSeconds: 3_600 });

    const maximum = await POST(request(input("00000000-0000-4000-8000-000000005373", 86_400), "timer-over-max"));
    expect(maximum.status).toBe(200);
    expect(await maximum.json()).toMatchObject({ kind: "saved", reason: "max-duration", session: { durationSeconds: 28_800 } });
  });

  it("makes duplicate stop requests harmless", async () => {
    const body = input("00000000-0000-4000-8000-000000005374");
    const first = await POST(request(body, "timer-duplicate"));
    const second = await POST(request(body, "timer-duplicate"));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((await first.json()).duplicate).toBe(false);
    expect((await second.json()).duplicate).toBe(true);
  });

  it("keeps offline, unauthorized, foreign and malformed requests typed", async () => {
    const body = input("00000000-0000-4000-8000-000000005375");
    expect((await (await POST(request(body, "timer-offline"))).json()).error.code).toBe("offline");
    expect((await (await POST(request(body, "timer-unauthorized"))).json()).error.code).toBe("unauthorized");
    expect((await (await POST(request(body, "timer-foreign"))).json()).error.code).toBe("not_found");
    const malformed = await POST(request({ ...body, user_id: "foreign-user" }, "timer-happy"));
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error.code).toBe("validation_error");
  });
});
