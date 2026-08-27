import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildDailyReminderDedupeKey,
  buildDailyReminderVariables,
  buildGoalAlarmDedupeKey,
  calculateReadingStreak,
  getActivityKstDateString,
  getReadingActivityCutoff,
  selectDailyReminderBook,
} from "./daily-reminder.ts";

Deno.test("selectDailyReminderBook picks the latest reading book", () => {
  const selected = selectDailyReminderBook([
    {
      id: "planned-book",
      user_id: "user-1",
      title: "Planned Book",
      current_page: 10,
      total_pages: 100,
      updated_at: "2026-06-27T18:00:00Z",
      status: "planned",
    },
    {
      id: "older-reading-book",
      user_id: "user-1",
      title: "Older Reading Book",
      current_page: 60,
      total_pages: 200,
      updated_at: "2026-06-26T18:00:00Z",
      status: "reading",
    },
    {
      id: "latest-reading-book",
      user_id: "user-1",
      title: "Latest Reading Book",
      current_page: 120,
      total_pages: 300,
      updated_at: "2026-06-27T17:30:00Z",
      status: "reading",
    },
  ]);

  assertEquals(selected?.id, "latest-reading-book");
});

Deno.test("selectDailyReminderBook prioritizes actual reading activity", () => {
  const selected = selectDailyReminderBook(
    [
      {
        id: "metadata-updated-book",
        user_id: "user-1",
        title: "Metadata Updated Book",
        current_page: 10,
        total_pages: 100,
        updated_at: "2026-07-26T10:00:00Z",
        status: "reading",
      },
      {
        id: "recently-read-book",
        user_id: "user-1",
        title: "Recently Read Book",
        current_page: 80,
        total_pages: 200,
        updated_at: "2026-07-24T10:00:00Z",
        status: "reading",
      },
    ],
    [
      {
        user_id: "user-1",
        book_id: "recently-read-book",
        created_at: "2026-07-25T20:00:00Z",
      },
    ],
  );

  assertEquals(selected?.id, "recently-read-book");
});

Deno.test("selectDailyReminderBook returns null when there is no reading book", () => {
  const selected = selectDailyReminderBook([
    {
      id: "planned-book",
      user_id: "user-1",
      title: "Planned Book",
      current_page: 10,
      total_pages: 100,
      updated_at: "2026-06-27T18:00:00Z",
      status: "planned",
    },
  ]);

  assertEquals(selected, null);
});

Deno.test("buildDailyReminderDedupeKey is stable per user, date, and token", () => {
  assertEquals(
    buildDailyReminderDedupeKey({
      kstDate: "2026-07-26",
      userId: "user-1",
      tokenHash: "token-hash",
    }),
    "daily:2026-07-26:user-1:token-hash",
  );
});

Deno.test("buildGoalAlarmDedupeKey includes the book and token", () => {
  assertEquals(
    buildGoalAlarmDedupeKey({
      kstDate: "2026-07-26",
      userId: "user-1",
      bookId: "book-1",
      tokenHash: "token-hash",
    }),
    "goal:2026-07-26:user-1:book-1:token-hash",
  );
});

Deno.test("getReadingActivityCutoff bounds history to 90 days", () => {
  assertEquals(
    getReadingActivityCutoff(new Date("2026-07-27T00:00:00.000Z")),
    "2026-04-28T00:00:00.000Z",
  );
});

Deno.test("getActivityKstDateString converts UTC timestamps to KST dates", () => {
  assertEquals(
    getActivityKstDateString("2026-07-25T16:00:00Z"),
    "2026-07-26",
  );
});

Deno.test("calculateReadingStreak uses consecutive KST reading dates", () => {
  const activities = [
    {
      user_id: "user-1",
      book_id: "book-1",
      created_at: "2026-07-25T13:00:00Z",
    },
    {
      user_id: "user-1",
      book_id: "book-2",
      created_at: "2026-07-24T13:00:00Z",
    },
    {
      user_id: "user-1",
      book_id: "book-1",
      created_at: "2026-07-22T13:00:00Z",
    },
  ];

  assertEquals(
    calculateReadingStreak(
      activities,
      new Date("2026-07-26T09:00:00+09:00"),
    ),
    2,
  );
});

Deno.test("buildDailyReminderVariables includes clamped progress percent", () => {
  assertEquals(
    buildDailyReminderVariables({
      id: "book-1",
      user_id: "user-1",
      title: "Reading Book",
      current_page: 120,
      total_pages: 300,
      updated_at: "2026-06-27T18:00:00Z",
      status: "reading",
    }),
    {
      bookTitle: "Reading Book",
      percent: "40",
    },
  );

  assertEquals(
    buildDailyReminderVariables({
      id: "book-2",
      user_id: "user-1",
      title: "Invalid Total Pages",
      current_page: 10,
      total_pages: 0,
      updated_at: "2026-06-27T18:00:00Z",
      status: "reading",
    }).percent,
    "0",
  );

  assertEquals(
    buildDailyReminderVariables({
      id: "book-3",
      user_id: "user-1",
      title: "Over Read",
      current_page: 120,
      total_pages: 100,
      updated_at: "2026-06-27T18:00:00Z",
      status: "reading",
    }).percent,
    "100",
  );
});
