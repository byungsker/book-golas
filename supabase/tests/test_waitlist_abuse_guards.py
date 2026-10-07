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
    require("create index if not exists waitlist_rate_limits_updated_at_idx")
    require("create or replace function public.cleanup_waitlist_rate_limits()")
    require("set search_path = ''")
    require("pg_catalog.btrim(p_email)")
    require("create or replace function public.register_waitlist_submission")
    require("security definer")
    require("set search_path = ''")
    require("for update")
    require("current_count >= 5")
    require("make_interval(hours => 1)")
    require("make_interval(hours => 2)")
    require("return 'rate_limited'")
    require("return 'duplicate'")
    require("grant execute on function public.register_waitlist_submission(text, text, text, text) to service_role")
    require("grant execute on function public.cleanup_waitlist_rate_limits() to service_role")
    if "user_agent" in SQL:
        raise AssertionError("waitlist RPC must not collect user_agent")
    if "drop policy" in SQL.lower() or "revoke insert on table public.waitlist" in SQL.lower():
        raise AssertionError("expand migration must preserve the legacy write path")
    print("waitlist abuse guard contract passed")


if __name__ == "__main__":
    main()
