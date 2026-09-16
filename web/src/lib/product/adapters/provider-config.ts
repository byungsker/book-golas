import "server-only";

export type ProviderConfig = Readonly<{
  googleBooksApiKey?: string;
  naverClientId?: string;
  naverClientSecret?: string;
}>;

function optionalSecret(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value !== "placeholder-key" ? value : undefined;
}

/** Provider credentials are read only in server modules and are never part of a client contract. */
export function getProviderConfig(): ProviderConfig {
  return {
    googleBooksApiKey: optionalSecret("GOOGLE_BOOKS_API_KEY"),
    naverClientId: optionalSecret("NAVER_CLIENT_ID"),
    naverClientSecret: optionalSecret("NAVER_CLIENT_SECRET"),
  };
}
