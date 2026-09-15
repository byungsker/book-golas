import type { BookRecommendation, BookSearchResult, RecommendationResult } from "@/lib/product/contracts";
import type { ProductError } from "@/lib/product/dal/errors";

const searchBooks = [
  {
    title: "The Reading Atlas",
    author: "Mina Park",
    imageUrl: null,
    totalPages: 240,
    isbn: "9780306406157",
    genre: "essay",
    publisher: "Bookgolas Press",
    aladinUrl: "https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=4281",
    price: 18000,
  },
  {
    title: "The Quiet Shelf",
    author: "Sora Lee",
    imageUrl: null,
    totalPages: 320,
    isbn: "9780140328721",
    genre: "fiction",
    publisher: "Bookgolas Press",
    aladinUrl: "https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=4282",
    price: 16000,
  },
] satisfies BookSearchResult[];

const recommendationItems = [
  {
    title: "The Reading Atlas",
    author: "Mina Park",
    reason: "A calm next step after your recent reading sessions.",
    keywords: ["attention", "essay"],
    imageUrl: null,
  },
  {
    title: "The Quiet Shelf",
    author: "Sora Lee",
    reason: "A reflective book for a slower reading rhythm.",
    keywords: ["reflection", "fiction"],
    imageUrl: null,
  },
] satisfies BookRecommendation[];

const recommendationResult: RecommendationResult = {
  success: true,
  recommendations: recommendationItems,
  profile: {
    stats: {
      totalBooksCompleted: 3,
      averageRating: 4.5,
      favoriteGenres: [{ genre: "essay", count: 2 }],
      averageCompletionDays: 12,
      highEngagementBookCount: 1,
    },
    booksAnalyzed: 3,
  },
};

const emptyRecommendationResult: RecommendationResult = {
  success: false,
  recommendations: [],
  profile: {
    stats: {
      totalBooksCompleted: 0,
      averageRating: 0,
      favoriteGenres: [],
      averageCompletionDays: 0,
      highEngagementBookCount: 0,
    },
    booksAnalyzed: 0,
  },
  error: "No completed books found",
};

function errorResult(error: ProductError) {
  return { error } as const;
}

const errors: Record<string, ProductError> = {
  "book-discovery-unauthorized": {
    code: "unauthorized",
    status: 401,
    message: "Sign-in required.",
    retryable: false,
  },
  "book-discovery-consent": {
    code: "consent_required",
    status: 403,
    message: "AI consent is required.",
    retryable: false,
  },
  "book-discovery-quota": {
    code: "quota_exceeded",
    status: 429,
    message: "Usage quota exceeded.",
    retryable: true,
  },
  "book-discovery-offline": {
    code: "offline",
    status: 503,
    message: "Book search is offline.",
    retryable: true,
  },
  "book-discovery-upstream": {
    code: "provider_error",
    status: 502,
    message: "The book provider is unavailable.",
    retryable: true,
  },
};

export type BookDiscoveryFixtureResult =
  | { kind: "search"; books: BookSearchResult[] }
  | { kind: "recommendations"; result: RecommendationResult }
  | { error: ProductError };

export async function getBookDiscoveryFixture(input: {
  fixture: string;
  action: "search" | "recommendations";
  query: string;
}): Promise<BookDiscoveryFixtureResult> {
  if (input.fixture === "book-discovery-cancellation" && input.action === "search" && input.query.trim().toLowerCase() === "slow") {
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  const fixtureError = errors[input.fixture];
  if (fixtureError) return errorResult(fixtureError);

  if (input.action === "recommendations") {
    return {
      kind: "recommendations",
      result: input.fixture === "book-discovery-empty" ? emptyRecommendationResult : recommendationResult,
    };
  }

  if (input.fixture === "book-discovery-empty") return { kind: "search", books: [] };
  if (input.fixture === "book-discovery-cancellation" && input.query.trim().toLowerCase() === "slow") {
    return { kind: "search", books: [searchBooks[0]] };
  }
  if (input.fixture === "book-discovery-cancellation") {
    return { kind: "search", books: [searchBooks[1]] };
  }
  return { kind: "search", books: [...searchBooks] };
}

export function getBookDiscoveryFixtureForbiddenMarkers() {
  return ["ALADIN_TTB_KEY", "ttbkey", "https://www.aladin.co.kr/ttb/api"];
}
