import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSupabasePublicConfig,
  SupabaseConfigurationError,
} from "./supabase-config";

vi.mock("server-only", () => ({}));

describe("Supabase environment boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  });

  it("missing-env fails before a browser client can start", async () => {
    await expect(import("./supabase")).rejects.toMatchObject({
      name: "SupabaseConfigurationError",
      variable: "NEXT_PUBLIC_SUPABASE_URL",
    });
  });

  it("rejects placeholder public credentials", () => {
    expect(() =>
      getSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "placeholder-key",
      }),
    ).toThrow(SupabaseConfigurationError);
  });

  it("accepts local development credentials without falling back", () => {
    expect(
      getSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-anon-key",
      }),
    ).toEqual({
      url: "http://127.0.0.1:54321",
      anonKey: "local-anon-key",
    });
  });

  it("requires the service role key separately", () => {
    return import("./supabase-admin").then(({ getSupabaseAdminConfig }) => {
      expect(() =>
        getSupabaseAdminConfig({
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-anon-key",
        }),
      ).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
    });
  });
});
