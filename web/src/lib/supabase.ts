import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export type PushTemplate = {
  id: string;
  type: string;
  name: string | null;
  title: string;
  body_template: string;
  title_en: string | null;
  body_template_en: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
};

export type PushLog = {
  id: string;
  user_id: string;
  push_type: string;
  book_id: string | null;
  title: string | null;
  body: string | null;
  sent_at: string;
  is_clicked: boolean;
  clicked_at: string | null;
};

export type PushStats = {
  date: string;
  push_type: string;
  sent_count: number;
  clicked_count: number;
  ctr: number;
};

export type PushAnnouncement = {
  id: string;
  title: string;
  body: string;
  status: "draft" | "sending" | "sent" | "failed";
  total_count: number;
  sent_count: number;
  failed_count: number;
  sent_at: string | null;
  created_at: string;
};

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

export const ROLE_CONFIG: Record<UserRole, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  admin: { label: "Admin", variant: "destructive" },
  user: { label: "User", variant: "secondary" },
};
