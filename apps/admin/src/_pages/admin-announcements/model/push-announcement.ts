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
