export type MetricValue = number | null;

export type GrowthMetricsRpc = {
  total_users: number;
  new_users_7d: number;
  active_users_7d: number;
  total_books: number;
  books_created_7d: number;
  users_with_books: number;
  total_reading_records: number;
  reading_records_7d: number;
  users_with_reading_records: number;
  total_ai_recalls: number;
  ai_recalls_7d: number;
  users_with_ai_recall: number;
};

export type AdminMonitoringMetrics = {
  generated_at: string;
  period_days: number;
  source_status: "connected" | "partial";
  unavailable_metrics: string[];
  users: {
    total: MetricValue;
    new_7d: MetricValue;
    active_7d: MetricValue;
  };
  books: {
    total: MetricValue;
    created_7d: MetricValue;
    users_with_books: MetricValue;
  };
  reading: {
    total_records: MetricValue;
    records_7d: MetricValue;
    users_with_records: MetricValue;
  };
  recall: {
    total: MetricValue;
    created_7d: MetricValue;
    users_with_recall: MetricValue;
  };
  push: {
    sent_7d: MetricValue;
    clicked_7d: MetricValue;
  };
};
