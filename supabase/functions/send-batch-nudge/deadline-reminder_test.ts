import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildDeadlineDedupeKey,
  buildDeadlineReminderVariables,
  calculateDeadlineState,
  selectDeadlineReminderBooks,
  shouldSendDeadlineReminder,
} from "./deadline-reminder.ts";

const nowKst = new Date("2026-07-10T03:00:00.000Z");

function book(overrides: Record<string, unknown>) {
  return {
    id: "book-1",
    user_id: "user-1",
    title: "Book",
    current_page: 100,
    total_pages: 300,
    target_date: "2026-07-13",
    updated_at: "2026-07-09T12:00:00.000Z",
    status: "reading",
    ...overrides,
  };
}

Deno.test("selectDeadlineReminderBooks includes every close reading book in priority order", () => {
  const selected = selectDeadlineReminderBooks([
    book({
      id: "d3",
      title: "D3",
      target_date: "2026-07-13",
      current_page: 200,
      total_pages: 300,
    }),
    book({
      id: "d1",
      title: "D1",
      target_date: "2026-07-11",
      current_page: 50,
      total_pages: 300,
    }),
    book({
      id: "d0",
      title: "D0",
      target_date: "2026-07-10",
      current_page: 250,
      total_pages: 300,
    }),
    book({
      id: "d3-more",
      title: "D3 More",
      target_date: "2026-07-13",
      current_page: 10,
      total_pages: 300,
    }),
    book({
      id: "d10",
      title: "D10",
      target_date: "2026-07-20",
      current_page: 0,
      total_pages: 300,
    }),
  ], nowKst);

  assertEquals(selected.map((item) => item.id), ["d0", "d1", "d3-more", "d3"]);
});

Deno.test("selectDeadlineReminderBooks filters out invalid or non-actionable books", () => {
  const selected = selectDeadlineReminderBooks([
    book({ id: "planned", status: "planned" }),
    book({ id: "no-target", target_date: null }),
    book({ id: "no-pages", total_pages: 0 }),
    book({ id: "finished", current_page: 300, total_pages: 300 }),
    book({ id: "too-overdue", target_date: "2026-07-02" }),
    book({ id: "valid-overdue", target_date: "2026-07-05" }),
  ], nowKst);

  assertEquals(selected.map((item) => item.id), ["valid-overdue"]);
});

Deno.test("calculateDeadlineState uses KST calendar dates for stage selection", () => {
  assertEquals(
    calculateDeadlineState(book({ target_date: "2026-07-17" }), nowKst)?.stage,
    "deadline_warmup",
  );
  assertEquals(
    calculateDeadlineState(book({ target_date: "2026-07-13" }), nowKst)?.stage,
    "deadline_soon",
  );
  assertEquals(
    calculateDeadlineState(book({ target_date: "2026-07-11" }), nowKst)?.stage,
    "deadline_tomorrow",
  );
  assertEquals(
    calculateDeadlineState(book({ target_date: "2026-07-10" }), nowKst)?.stage,
    "deadline_today",
  );
  assertEquals(
    calculateDeadlineState(book({ target_date: "2026-07-09" }), nowKst)?.stage,
    "deadline_overdue",
  );
  assertEquals(
    calculateDeadlineState(book({ target_date: "2026-07-18" }), nowKst),
    null,
  );
  assertEquals(
    calculateDeadlineState(book({ target_date: "2026-07-02" }), nowKst),
    null,
  );
});

Deno.test("buildDeadlineReminderVariables includes remaining pages and catch-up target", () => {
  const state = calculateDeadlineState(
    book({
      title: "Deadline Book",
      current_page: 120,
      total_pages: 300,
      target_date: "2026-07-13",
    }),
    nowKst,
  );

  assertEquals(buildDeadlineReminderVariables(state!), {
    bookTitle: "Deadline Book",
    daysLeft: "3",
    remainingPages: "180",
    targetPages: "45",
    percent: "40",
  });
});

Deno.test("shouldSendDeadlineReminder respects stage slots, quiet hours, and dedupe", () => {
  assertEquals(
    shouldSendDeadlineReminder({
      stage: "deadline_warmup",
      kstHour: 20,
      kstMinute: 0,
      goalHour: 20,
      goalMinute: 0,
      dedupeKey: "warmup",
      sentKeys: new Set(),
    }),
    { shouldSend: true, slotLabel: "goal" },
  );

  assertEquals(
    shouldSendDeadlineReminder({
      stage: "deadline_soon",
      kstHour: 18,
      kstMinute: 0,
      goalHour: 20,
      goalMinute: 0,
      dedupeKey: "soon-evening",
      sentKeys: new Set(),
    }),
    { shouldSend: true, slotLabel: "secondary_18" },
  );

  assertEquals(
    shouldSendDeadlineReminder({
      stage: "deadline_soon",
      kstHour: 7,
      kstMinute: 30,
      goalHour: 20,
      goalMinute: 0,
      dedupeKey: "quiet",
      sentKeys: new Set(),
    }).shouldSend,
    false,
  );

  assertEquals(
    shouldSendDeadlineReminder({
      stage: "deadline_today",
      kstHour: 20,
      kstMinute: 0,
      goalHour: 20,
      goalMinute: 0,
      dedupeKey: "sent",
      sentKeys: new Set(["sent"]),
    }).shouldSend,
    false,
  );
});

Deno.test("buildDeadlineDedupeKey includes date, user, book, stage, and slot", () => {
  assertEquals(
    buildDeadlineDedupeKey({
      kstDate: "2026-07-10",
      userId: "user-1",
      bookId: "book-1",
      stage: "deadline_today",
      slotLabel: "goal",
    }),
    "deadline:2026-07-10:user-1:book-1:deadline_today:goal",
  );
});
