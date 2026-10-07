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
  sent_at: string | null;
  created_at: string;
  is_clicked: boolean;
  clicked_at: string | null;
  delivery_status?: "pending" | "sent" | "failed" | "skipped" | null;
  failure_code?: string | null;
  invalid_token?: boolean | null;
  dedupe_status?: "not_applicable" | "reserved" | "sent" | "failed" | "skipped" | null;
};
