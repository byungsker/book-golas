export { default as StatsPage } from "./ui/StatsPage";
export { default as StatsLoading } from "./ui/StatsLoading";
export {
  fetchOwnedReadingAnalyticsData,
  type ReadingAnalyticsQueryResult,
} from "./api/fetch-reading-analytics-data";
export {
  generateChartsGoalsFixtureInsight,
  setChartsGoalsFixtureGoal,
} from "./model/charts-goals-fixtures";
export {
  ChartsGoalsMutationRequestSchema,
  MAX_READING_ANALYTICS_INSIGHTS,
  ReadingAnalyticsInsightSuccessSchema,
  ReadingAnalyticsInsightsSchema,
} from "./api/reading-analytics-contracts";
