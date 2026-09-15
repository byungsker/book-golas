import { getConsumerPath, getSafeNextPath, type ConsumerLocale } from "./paths";

export const oauthProviders = ["google", "apple"] as const;

export type OAuthProvider = (typeof oauthProviders)[number];
export type OAuthErrorKey =
  | "errors.oauthCancelled"
  | "errors.oauthProvider"
  | "errors.authCallback";

type OAuthResponse = {
  data: { url: string | null };
  error: { message: string; name?: string } | null;
};

export type OAuthAuthClient = {
  signInWithOAuth: (credentials: {
    provider: OAuthProvider;
    options: { redirectTo: string; skipBrowserRedirect: true };
  }) => Promise<OAuthResponse>;
};

export function getOAuthCallbackUrl(
  origin: string,
  locale: ConsumerLocale,
  returnTo: string,
): string {
  const callback = new URL(getConsumerPath(locale, "/auth/callback"), origin);
  callback.searchParams.set("returnTo", getSafeNextPath(locale, returnTo));
  return callback.toString();
}

export function signInWithOAuth(
  auth: OAuthAuthClient,
  provider: OAuthProvider,
  options: {
    origin: string;
    locale: ConsumerLocale;
    returnTo: string;
  },
) {
  return auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: getOAuthCallbackUrl(options.origin, options.locale, options.returnTo),
      skipBrowserRedirect: true,
    },
  });
}

export function getOAuthStartErrorKey(error: unknown): OAuthErrorKey {
  const message = error instanceof Error ? `${error.name} ${error.message}`.toLowerCase() : "";
  return /abort|cancel|popup.closed|popup_closed/.test(message)
    ? "errors.oauthCancelled"
    : "errors.oauthProvider";
}

export function getOAuthCallbackErrorKey(value: string | undefined): OAuthErrorKey | null {
  if (value === "oauth_cancelled") return "errors.oauthCancelled";
  if (value === "oauth_provider") return "errors.oauthProvider";
  if (value === "auth_callback") return "errors.authCallback";
  return null;
}
