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

export function getPasswordMinLength(
  mode: AuthMode,
  isRecovery: boolean,
): 8 | undefined {
  if (mode === "sign-in") return undefined;
  if (mode === "sign-up") return 8;
  return isRecovery ? 8 : undefined;
}

export function signInWithPassword(
  auth: PasswordAuthClient,
  email: string,
  password: string,
) {
  return auth.signInWithPassword({ email, password });
}

export async function signOutUser(auth: SignOutAuthClient): Promise<boolean> {
  try {
    const { error } = await auth.signOut();
    return !error;
  } catch {
    return false;
  }
}
