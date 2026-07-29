export type MetricValue = number | null;

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
