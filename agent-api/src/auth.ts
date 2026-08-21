export interface AuthenticatedUser {
  id: string;
}

export interface Authenticator {
  verify(token: string, signal?: AbortSignal): Promise<AuthenticatedUser>;
}

export class AuthenticationError extends Error {
  readonly status: 401 | 503;
  readonly retryable: boolean;

  constructor(message: string, status: 401 | 503, retryable: boolean) {
    super(message);
    this.name = "AuthenticationError";
    this.status = status;
    this.retryable = retryable;
  }
}

export function getBearerToken(request: Request): string | null {
  const value = request.headers.get("authorization")?.trim() ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(value);
  return match?.[1] ?? null;
}

function parseUserId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const userId = value.trim();
  if (!userId || userId.length > 128 || /\s/.test(userId)) return null;
  return userId;
}

export class SupabaseAuthenticator implements Authenticator {
  constructor(
    private readonly supabaseUrl: string,
    private readonly anonKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async verify(
    token: string,
    signal?: AbortSignal,
  ): Promise<AuthenticatedUser> {
    if (!this.supabaseUrl || !this.anonKey) {
      throw new AuthenticationError(
        "Agent API authentication is not configured",
        503,
        false,
      );
    }

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.supabaseUrl}/auth/v1/user`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          apikey: this.anonKey,
          Authorization: `Bearer ${token}`,
        },
        signal,
      });
    } catch {
      throw new AuthenticationError(
        "Authentication provider is unavailable",
        503,
        true,
      );
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new AuthenticationError("Authentication is required", 401, false);
      }
      throw new AuthenticationError(
        "Authentication provider is unavailable",
        503,
        true,
      );
    }

    const body = await response.json().catch(() => null) as
      | { id?: unknown }
      | null;
    const userId = parseUserId(body?.id);
    if (!userId) {
      throw new AuthenticationError("Authentication is required", 401, false);
    }
    return { id: userId };
  }
}
