import { parseConsumerBook, type ConsumerBook } from "./types";

const fixtureUserId = "00000000-0000-4000-8000-000000000001";

const fixtureRows = [
  {
    id: "00000000-0000-4000-8000-000000004291",
    title: "The Reading Atlas",
    author: "Mina Park",
    start_date: "2026-09-01T00:00:00.000Z",
    target_date: "2026-09-24T00:00:00.000Z",
    planned_start_date: null,
    image_url: null,
    current_page: 84,
    total_pages: 240,
    status: "reading",
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-16T00:00:00.000Z",
    paused_at: null,
    deleted_at: null,
    user_id: fixtureUserId,
  },
  {
    id: "00000000-0000-4000-8000-000000004292",
    title: "Finished Signals",
    author: "J. Han",
    start_date: "2026-08-01T00:00:00.000Z",
    target_date: "2026-08-20T00:00:00.000Z",
    planned_start_date: null,
    image_url: null,
    current_page: 180,
    total_pages: 180,
    status: "completed",
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-09-14T00:00:00.000Z",
    paused_at: null,
    deleted_at: null,
    user_id: fixtureUserId,
  },
  {
    id: "00000000-0000-4000-8000-000000004293",
    title: "The Quiet Shelf",
    author: "Sora Lee",
    start_date: "2026-09-20T00:00:00.000Z",
    target_date: "2026-10-20T00:00:00.000Z",
    planned_start_date: "2026-09-20T00:00:00.000Z",
    image_url: null,
    current_page: 0,
    total_pages: 320,
    status: "planned",
    created_at: "2026-09-05T00:00:00.000Z",
    updated_at: "2026-09-12T00:00:00.000Z",
    paused_at: null,
    deleted_at: null,
    user_id: fixtureUserId,
  },
  {
    id: "00000000-0000-4000-8000-000000004294",
    title: "Try Again Tomorrow",
    author: "N. Choi",
    start_date: "2026-07-01T00:00:00.000Z",
    target_date: "2026-09-10T00:00:00.000Z",
    planned_start_date: null,
    image_url: null,
    current_page: 48,
    total_pages: 200,
    status: "will_retry",
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-09-11T00:00:00.000Z",
    paused_at: "2026-09-11T00:00:00.000Z",
    deleted_at: null,
    user_id: fixtureUserId,
  },
  {
    id: "00000000-0000-4000-8000-000000004299",
    title: "Deleted private fixture",
    author: "Hidden Author",
    start_date: "2026-01-01T00:00:00.000Z",
    target_date: "2026-01-30T00:00:00.000Z",
    planned_start_date: null,
    image_url: null,
    current_page: 30,
    total_pages: 100,
    status: "reading",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    paused_at: null,
    deleted_at: "2026-09-01T00:00:00.000Z",
    user_id: fixtureUserId,
  },
] as const;

export function getHomeBookListFixtureBooks(): ConsumerBook[] {
  return fixtureRows.flatMap((row) => {
    if (row.deleted_at !== null || row.user_id !== fixtureUserId) return [];
    const book = parseConsumerBook(row);
    return book ? [book] : [];
  });
}
