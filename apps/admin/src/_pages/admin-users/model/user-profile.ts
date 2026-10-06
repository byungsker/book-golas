export type UserRole = "user" | "admin";

export type UserProfile = {
  id: string;
  email: string;
  nickname: string | null;
  name: string | null;
  role: UserRole;
  subscription_status: string;
  created_at: string;
  last_sign_in_at: string | null;
};

export const ROLE_CONFIG: Record<
  UserRole,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  admin: { label: "Admin", variant: "destructive" },
  user: { label: "User", variant: "secondary" },
};
