from pathlib import Path


SQL = Path(__file__).parents[1].joinpath(
    "migrations/20260808160044_add_waitlist_abuse_guards.sql"
).read_text(encoding="utf-8")


def require(fragment: str) -> None:
    if fragment not in SQL:
        raise AssertionError(f"missing SQL contract: {fragment}")


def main() -> None:
    require("create table if not exists public.waitlist_rate_limits")
    require("alter table public.waitlist_rate_limits enable row level security")
    require("revoke all on table public.waitlist_rate_limits from public, anon, authenticated")
    require("create or replace function public.register_waitlist_submission")
    require("security definer")
    require("set search_path = public, pg_temp")
    require("for update")
    require("current_count >= 5")
    require("interval '1 hour'")
    require("interval '2 hours'")
    require("return 'rate_limited'")
    require("return 'duplicate'")
    require("grant execute on function public.register_waitlist_submission(text, text, text, text) to anon, authenticated")
    if "user_agent" in SQL:
        raise AssertionError("waitlist RPC must not collect user_agent")
    if "drop policy" in SQL.lower() or "revoke insert on table public.waitlist" in SQL.lower():
        raise AssertionError("expand migration must preserve the legacy write path")
    print("waitlist abuse guard contract passed")


if __name__ == "__main__":
    main()
