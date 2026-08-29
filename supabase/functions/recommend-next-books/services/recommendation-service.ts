import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import type {
  BookReadingAnalytics,
  Recommendation,
  UserReadingProfile,
} from "../types.ts";
import { config } from "../config.ts";
import {
  AI_MAX_OUTPUT_TOKENS,
  AI_PROVIDER_TIMEOUT_MS,
} from "../../_shared/ai-usage.ts";
import type {
  AiBudgetContext,
  AiProviderOperation,
} from "../../_shared/ai-usage.ts";

const PROMPT_KO = `
당신은 독서 추천 전문가입니다. 사용자의 **책별 세부 독서 패턴**을 분석하여 다음 읽을 책 {recommendCount}권을 추천해주세요.

## 📊 사용자 프로필
- 완독한 책: {totalBooks}권
- 평균 별점: {avgRating}/5
- 선호 장르: {favoriteGenres}
- 평균 완독 소요: {avgDays}일
- 높은 몰입도 책: {highEngagement}권

## 📚 최근 완독한 책 상세 분석
{booksDetail}

## 💡 사용자가 자주 하이라이트한 내용
{highlightsContext}

## 🎯 자주 등장하는 키워드
{keywords}

## ✅ 추천 기준
1. 장르 선호도: {favoriteGenres}
2. 독서 속도: {avgDays}일 내외
3. 참여도 패턴: 하이라이트/메모가 많았던 책 스타일
4. 일일 목표 달성률 기반 난이도 조절
5. attemptCount=1인 책의 특성 분석
6. 하이라이트 키워드 기반 주제 연관성

## 📤 출력 형식 (JSON만)
[
  {{"title": "책 제목", "author": "저자명", "reason": "추천 이유 (2-3문장)", "keywords": ["키워드1", "키워드2", "키워드3"]}},
  ...
]

**중요**: 
- 실제 존재하는 한국 도서만 추천
- keywords는 이 책을 추천하는 핵심 이유를 2-3개 단어로 표현 (예: "자기계발", "리더십", "심리학")
- JSON만 출력
`;

const PROMPT_EN = `
You are a book recommendation expert. Analyze the user's **detailed reading patterns per book** and recommend {recommendCount} books to read next.

## 📊 User Profile
- Books completed: {totalBooks}
- Average rating: {avgRating}/5
- Favorite genres: {favoriteGenres}
- Average completion time: {avgDays} days
- High engagement books: {highEngagement}

## 📚 Recently Completed Books Analysis
{booksDetail}

## 💡 Frequently Highlighted Content
{highlightsContext}

## 🎯 Frequent Keywords
{keywords}

## ✅ Recommendation Criteria
1. Genre preference: {favoriteGenres}
2. Reading pace: around {avgDays} days
3. Engagement pattern: similar to books with many highlights/notes
4. Difficulty based on daily goal achievement rate
5. Characteristics of books completed on first attempt
6. Topic relevance based on highlight keywords

## 📤 Output Format (JSON only)
[
  {{"title": "Book Title", "author": "Author Name", "reason": "Recommendation reason (2-3 sentences)", "keywords": ["keyword1", "keyword2", "keyword3"]}},
  ...
]

**Important**: 
- Only recommend actual existing English books (internationally published)
- keywords should express the core reasons for recommending this book in 2-3 words (e.g., "self-improvement", "leadership", "psychology")
- Output JSON only
`;

export class RecommendationService {
  private llm: ChatOpenAI;
  private promptTemplate: PromptTemplate;
  private locale: string;
  private readonly runProviderCall: <T>(
    input: string,
    context: AiBudgetContext,
    operation: AiProviderOperation<T>,
  ) => Promise<T>;

  constructor(
    runProviderCall: <T>(
      input: string,
      context: AiBudgetContext,
      operation: AiProviderOperation<T>,
    ) => Promise<T>,
    locale: string = "ko",
  ) {
    this.locale = locale;
    this.runProviderCall = runProviderCall;
    this.llm = new ChatOpenAI({
      openAIApiKey: config.openai.apiKey,
      modelName: config.openai.model,
      temperature: config.openai.temperature,
      maxTokens: AI_MAX_OUTPUT_TOKENS,
      maxRetries: 0,
      timeout: AI_PROVIDER_TIMEOUT_MS,
    });

    const promptText = locale === "ko" ? PROMPT_KO : PROMPT_EN;
    this.promptTemplate = PromptTemplate.fromTemplate(promptText);
  }

  async generate(profile: UserReadingProfile): Promise<Recommendation[]> {
    const booksDetail = this.formatBooksDetail(profile.books);
    const highlightsContext = this.formatHighlights(
      profile.interests.topHighlights,
    );

    const noneText = this.locale === "ko" ? "(없음)" : "(none)";
    const diverseText = this.locale === "ko" ? "다양" : "Various";

    const formattedPrompt = await this.promptTemplate.format({
      recommendCount: config.recommendation.count,
      totalBooks: profile.stats.totalBooksCompleted,
      avgRating: profile.stats.averageRating,
      favoriteGenres: profile.stats.favoriteGenres.map((g) =>
        g.genre
      ).join(", ") || diverseText,
      avgDays: profile.stats.averageCompletionDays,
      highEngagement: profile.stats.highEngagementBookCount,
      booksDetail,
      highlightsContext: highlightsContext || noneText,
      keywords: profile.interests.keywords.join(", ") || noneText,
    });

    const response = await this.runProviderCall(
      formattedPrompt,
      {
        functionName: "recommend-next-books",
        feature: "recommend-next-books",
        provider: "open_ai",
        model: "gpt-4o-mini",
        promptVersion: "recommendations-v1",
        maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
        requireOutputTokens: true,
      },
      async () => {
        const value = await this.llm.invoke(formattedPrompt);
        return { value, usage: value };
      },
    );
    return this.parseResponse(response.content as string);
  }

  private formatBooksDetail(books: BookReadingAnalytics[]): string {
    const unclassifiedText = this.locale === "ko" ? "미분류" : "Uncategorized";
    const noneText = this.locale === "ko" ? "없음" : "None";
    const completedFirstTryText = this.locale === "ko"
      ? "(단번 완독)"
      : "(completed first try)";

    return books
      .slice(0, config.recommendation.maxBooksToAnalyze)
      .map(
        (b, idx) => `
${
          idx + 1
        }. "${b.title}" (${b.author})
   - Genre: ${b.genre || unclassifiedText}
   - Completed in: ${b.daysToComplete} days (avg ${b.averagePagesPerDay}p/day)
   - Engagement: ${b.highlightCount} highlights, ${b.noteCount} notes
   - Rating: ${b.rating ? `${b.rating}/5` : noneText}
   - Daily goal achievement: ${b.dailyGoalAchievementRate}%
   - Attempts: ${b.attemptCount} ${
          b.attemptCount === 1 ? completedFirstTryText : ""
        }
        `,
      )
      .join("\n");
  }

  private formatHighlights(
    highlights: Array<{ content: string; bookTitle: string }>,
  ): string {
    return highlights
      .slice(0, 5)
      .map(
        (h, idx) =>
          `${idx + 1}. "${h.content.substring(0, 100)}..." (${h.bookTitle})`,
      )
      .join("\n");
  }

  private parseResponse(content: string): Recommendation[] {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("LLM response is not in JSON format");
    }
    return JSON.parse(jsonMatch[0]);
  }
}
