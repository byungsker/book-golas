import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key';

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export type PushTemplate = {
  id: string;
  type: string;
  title: string;
  body_template: string;
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
