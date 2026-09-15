export type AuthMode = "sign-in" | "sign-up" | "reset-password";

type AuthResponse = {
  error: { message: string } | null;
};

export type PasswordAuthClient = {
  signInWithPassword: (credentials: {
    email: string;
    password: string;
  }) => Promise<AuthResponse>;
};

export type SignOutAuthClient = {
  signOut: () => Promise<AuthResponse>;
};

export type SavedEmailStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const savedEmailStorageKey = "bookgolas.auth.saved-email";

export function getPasswordMinLength(
  mode: AuthMode,
  isRecovery: boolean,
): 6 | undefined {
  if (mode === "sign-in") return undefined;
  if (mode === "sign-up") return 6;
  return isRecovery ? 6 : undefined;
}

export type PasswordValidationError = "short" | "mismatch";

export function getPasswordValidationError(
  mode: AuthMode,
  isRecovery: boolean,
  password: string,
  confirmation: string,
): PasswordValidationError | null {
  const minimum = getPasswordMinLength(mode, isRecovery);
  if (minimum !== undefined && password.length < minimum) return "short";
  if (mode === "reset-password" && isRecovery && minimum !== undefined && confirmation.length < minimum) {
    return "short";
  }
  if (mode === "reset-password" && isRecovery && password !== confirmation) return "mismatch";
  return null;
}

export function signInWithPassword(
  auth: PasswordAuthClient,
  email: string,
  password: string,
) {
  return auth.signInWithPassword({ email, password });
}

export function getNicknameValidationError(nickname: string): "required" | null {
  return nickname.trim() ? null : "required";
}

export function getEmailValidationError(email: string): "required" | "invalid" | null {
  const normalized = email.trim();
  if (!normalized) return "required";
  if (!normalized.includes("@")) return "invalid";
  return null;
}

export function isEmailUnconfirmedError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("email not confirmed") || normalized.includes("email_not_confirmed");
}

export function isAccountExistenceError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("already registered") ||
    normalized.includes("user not found") ||
    normalized.includes("email not found")
  );
}

export function getSignInErrorKey(message: string): string {
  if (isEmailUnconfirmedError(message)) return "errors.emailUnconfirmed";
  if (message.toLowerCase().includes("invalid login credentials")) {
    return "errors.invalidCredentials";
  }
  return "errors.generic";
}

export function readSavedEmail(storage: SavedEmailStorage): string {
  try {
    return storage.getItem(savedEmailStorageKey)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function writeSavedEmail(
  storage: SavedEmailStorage,
  email: string,
  shouldSave: boolean,
): void {
  try {
    if (shouldSave) {
      storage.setItem(savedEmailStorageKey, email.trim());
    } else {
      storage.removeItem(savedEmailStorageKey);
    }
  } catch {
    return;
  }
}

export async function signOutUser(auth: SignOutAuthClient): Promise<boolean> {
  try {
    const { error } = await auth.signOut();
    return !error;
  } catch {
    return false;
  }
}
