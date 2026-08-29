import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { SupabaseClient } from "@supabase/supabase-js";
import type { ReadingInsight, ReadingPatterns } from "../types.ts";
import { config } from "../config.ts";
import {
  AI_MAX_OUTPUT_TOKENS,
  AI_PROVIDER_TIMEOUT_MS,
} from "../../_shared/ai-usage.ts";
import type {
  AiBudgetContext,
  AiProviderOperation,
} from "../../_shared/ai-usage.ts";

interface MemoryRecord {
  id: string;
  user_id: string;
  insight_content: string;
  insight_metadata: Record<string, unknown>;
  created_at: string;
}

interface RateLimitRecord {
  id: string;
  user_id: string;
  last_generated_at: string;
}

interface LLMInsightResponse {
  title: string;
  description: string;
  category: "pattern" | "milestone" | "reflection";
  relatedBooks: string[];
}

export class InsightService {
  private llm: ChatOpenAI;
  private supabase: SupabaseClient;
  private promptTemplate: PromptTemplate;
  private readonly runProviderCall: <T>(
    input: string,
    context: AiBudgetContext,
    operation: AiProviderOperation<T>,
  ) => Promise<T>;

  constructor(
    supabase: SupabaseClient,
    runProviderCall: <T>(
      input: string,
      context: AiBudgetContext,
      operation: AiProviderOperation<T>,
    ) => Promise<T>,
  ) {
    this.supabase = supabase;
    this.runProviderCall = runProviderCall;

    this.llm = new ChatOpenAI({
      openAIApiKey: config.openai.apiKey,
      modelName: config.openai.model,
      temperature: config.openai.temperature,
      maxTokens: AI_MAX_OUTPUT_TOKENS,
      maxRetries: 0,
      timeout: Math.min(
        config.insights.timeoutSeconds * 1000,
        AI_PROVIDER_TIMEOUT_MS,
      ),
    });

    this.promptTemplate = PromptTemplate.fromTemplate(`
당신은 독서 패턴 분석 전문가입니다. 사용자의 독서 데이터를 분석하여 의미 있는 인사이트를 제공해주세요.

## 독서 패턴 데이터
- 월별 독서량: {monthlyReadingCounts}
- 장르 분포: {genreDistribution}
- 독서 습관: {readingHabits}
- 완독률: {completionRates}
- 하이라이트 통계: {highlightStats}
- 전년 대비: {yearOverYear}

## 이전 인사이트 (참고용)
{memory}

## 분석 기준
1. **시간에 따른 변화**: 작년과 올해의 독서 패턴 변화 (장르, 독서량, 하이라이트 수)
2. **독서 습관**: 주로 읽는 시간대, 요일 패턴
3. **완독 패턴**: 완독률, 재시도 성공률, 포기율
4. **관심사 변화**: 하이라이트 키워드 기반 관심사 추이
5. **이전 인사이트 연결**: "지난번 분석에서 언급했던 X가 Y로 변화했습니다"

## 출력 형식 (JSON만)
[
  {{
    "title": "인사이트 제목 (10자 이내)",
    "description": "상세 설명 (2-3문장, 구체적 수치 포함)",
    "category": "pattern" | "milestone" | "reflection",
    "relatedBooks": ["책 제목1", "책 제목2"]
  }},
  ...
]

**중요**:
- 3-5개의 인사이트 생성
- 구체적 수치 포함 (예: "작년 대비 30% 증가")
- 이전 인사이트와 연결 (있을 경우)
- JSON만 출력
    `);
  }

  async generate(
    userId: string,
    patterns: ReadingPatterns,
  ): Promise<ReadingInsight[]> {
    const canGenerate = await this.checkRateLimit(userId);
    if (!canGenerate) {
      const hoursRemaining = await this.getHoursUntilNextGeneration(userId);
      throw new Error(
        `Rate limit exceeded. Try again in ${hoursRemaining} hours.`,
      );
    }

    const memory = await this.loadMemory(userId);

    const formattedPrompt = await this.promptTemplate.format({
      monthlyReadingCounts: this.formatMonthlyReadingCounts(patterns),
      genreDistribution: this.formatGenreDistribution(patterns),
      readingHabits: this.formatReadingHabits(patterns),
      completionRates: this.formatCompletionRates(patterns),
      highlightStats: this.formatHighlightStats(patterns),
      yearOverYear: this.formatYearOverYear(patterns),
      memory: memory || "(이전 인사이트 없음)",
    });
    const response = await this.runProviderCall(
      formattedPrompt,
      {
        functionName: "reading-insights",
        feature: "reading-insights",
        provider: "open_ai",
        model: "gpt-4o-mini",
        promptVersion: "reading-insights-v1",
        maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
        requireOutputTokens: true,
      },
      async () => {
        const value = await this.llm.invoke(formattedPrompt);
        return { value, usage: value };
      },
    );

    const insights = this.parseResponse(response.content as string);

    await this.saveMemory(userId, insights, {
      patternsCollectedAt: patterns.collectedAt,
      totalBooks: patterns.completionRates.totalStarted,
      completedBooks: patterns.completionRates.completed,
    });

    await this.updateRateLimit(userId);

    return insights;
  }

  private async checkRateLimit(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("reading_insights_rate_limit")
      .select("last_generated_at")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Rate limit check failed: ${error.message}`);
    }

    if (!data || !data.last_generated_at) {
      return true;
    }

    const lastGenerated = new Date(data.last_generated_at);
    const now = new Date();
    const hoursSinceLastGeneration = (now.getTime() - lastGenerated.getTime()) /
      (1000 * 60 * 60);

    return hoursSinceLastGeneration >= config.insights.rateLimitHours;
  }

  private async getHoursUntilNextGeneration(userId: string): Promise<number> {
    const { data } = await this.supabase
      .from("reading_insights_rate_limit")
      .select("last_generated_at")
      .eq("user_id", userId)
      .single();

    if (!data || !data.last_generated_at) {
      return 0;
    }

    const lastGenerated = new Date(data.last_generated_at);
    const now = new Date();
    const hoursSinceLastGeneration = (now.getTime() - lastGenerated.getTime()) /
      (1000 * 60 * 60);
    const hoursRemaining = config.insights.rateLimitHours -
      hoursSinceLastGeneration;

    return Math.max(0, Math.ceil(hoursRemaining));
  }

  private async updateRateLimit(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from("reading_insights_rate_limit")
      .upsert(
        {
          user_id: userId,
          last_generated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (error) {
      throw new Error(`Rate limit update failed: ${error.message}`);
    }
  }

  private async loadMemory(userId: string): Promise<string> {
    const { data, error } = await this.supabase
      .from("reading_insights_memory")
      .select("insight_content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(config.insights.memoryLimit);

    if (error) {
      throw new Error(`Memory load failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return "";
    }

    const memoryEntries = data.map(
      (
        record: { insight_content: string; created_at: string },
        index: number,
      ) => {
        const insights: LLMInsightResponse[] = JSON.parse(
          record.insight_content,
        );
        const date = new Date(record.created_at).toLocaleDateString("ko-KR");
        const insightTitles = insights.map((i) => i.title).join(", ");
        return `${index + 1}. [${date}] ${insightTitles}`;
      },
    );

    return `이전 인사이트:\n${memoryEntries.join("\n")}`;
  }

  private async saveMemory(
    userId: string,
    insights: ReadingInsight[],
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const insightContent = JSON.stringify(
      insights.map((i) => ({
        title: i.title,
        description: i.description,
        category: i.category,
        relatedBooks: i.relatedBooks,
      })),
    );

    const { error } = await this.supabase
      .from("reading_insights_memory")
      .insert({
        user_id: userId,
        insight_content: insightContent,
        insight_metadata: metadata,
      });

    if (error) {
      throw new Error(`Memory save failed: ${error.message}`);
    }
  }

  private parseResponse(content: string): ReadingInsight[] {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Failed to parse LLM response");
    }

    const parsed: LLMInsightResponse[] = JSON.parse(jsonMatch[0]);

    return parsed.map((item) => ({
      id: crypto.randomUUID(),
      title: item.title,
      description: item.description,
      category: item.category,
      relatedBooks: item.relatedBooks || [],
      generatedAt: new Date().toISOString(),
    }));
  }

  private formatMonthlyReadingCounts(patterns: ReadingPatterns): string {
    if (patterns.monthlyReadingCounts.length === 0) {
      return "(데이터 없음)";
    }
    return patterns.monthlyReadingCounts
      .slice(-6)
      .map((m) => `${m.month}: ${m.count}권`)
      .join(", ");
  }

  private formatGenreDistribution(patterns: ReadingPatterns): string {
    if (patterns.genreDistribution.length === 0) {
      return "(데이터 없음)";
    }
    return patterns.genreDistribution
      .slice(0, 5)
      .map((g) => `${g.genre} ${g.percentage}%`)
      .join(", ");
  }

  private formatReadingHabits(patterns: ReadingPatterns): string {
    const habits = patterns.readingHabits;
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

    const peakHour = habits.peakReadingHour !== null
      ? `${habits.peakReadingHour}시`
      : "데이터 없음";
    const peakDay = habits.peakReadingDay !== null
      ? `${dayNames[habits.peakReadingDay]}요일`
      : "데이터 없음";

    return `주로 ${peakHour}에 독서, ${peakDay}에 가장 많이 읽음`;
  }

  private formatCompletionRates(patterns: ReadingPatterns): string {
    const rates = patterns.completionRates;
    return `완독률 ${rates.completionRate}%, 포기율 ${rates.abandonRate}%, 재시도 성공률 ${rates.retrySuccessRate}%`;
  }

  private formatHighlightStats(patterns: ReadingPatterns): string {
    const stats = patterns.highlightStats;
    const keywords = stats.topKeywords.length > 0
      ? stats.topKeywords.slice(0, 5).join(", ")
      : "없음";
    return `총 ${stats.totalCount}개, 주요 키워드: ${keywords}`;
  }

  private formatYearOverYear(patterns: ReadingPatterns): string {
    const yoy = patterns.yearOverYear;
    const changeDirection = yoy.changePercentage >= 0 ? "증가" : "감소";
    return `${yoy.previousYear}년 ${yoy.previousYearCompleted}권 → ${yoy.currentYear}년 ${yoy.currentYearCompleted}권 (${
      Math.abs(yoy.changePercentage)
    }% ${changeDirection})`;
  }
}
