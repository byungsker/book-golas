import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildDailyReminderVariables,
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
