import { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { config } from "../config.ts";
import { extractKeywords } from "../utils/keyword-extractor.ts";
import { AI_PROVIDER_TIMEOUT_MS } from "../../_shared/ai-usage.ts";

interface HighlightWithBook {
  content: string;
  bookTitle: string;
}

interface UserInterests {
  topHighlights: HighlightWithBook[];
  keywords: string[];
}

export async function extractUserInterests(
  supabase: SupabaseClient,
  userId: string,
  beforeProviderCall: (
    input: string,
  ) => Promise<() => Promise<void>> = async () => async () => {},
): Promise<UserInterests> {
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: config.openai.apiKey,
    timeout: AI_PROVIDER_TIMEOUT_MS,
  });

  const vectorStore = new SupabaseVectorStore(embeddings, {
    client: supabase,
    tableName: "reading_content_embeddings",
    queryName: "match_user_interests",
  });

  const interestQuery = "독서에서 중요하게 생각하는 주제와 개념";
  const releaseProviderLease = await beforeProviderCall(interestQuery);
  let results;
  try {
    results = await vectorStore.similaritySearch(
      interestQuery,
      config.rag.topHighlightsCount,
      { user_id: userId },
    );
  } finally {
    await releaseProviderLease();
  }

  if (results.length === 0) {
    return { topHighlights: [], keywords: [] };
  }

  const bookIds = [
    ...new Set(results.map((doc: Document) => doc.metadata.book_id as string)),
  ];

  const { data: books } = await supabase
    .from("books")
    .select("id, title")
    .in("id", bookIds);

  const bookTitleMap = new Map<string, string>(
    books?.map((b: { id: string; title: string }) => [b.id, b.title]) || [],
  );

  const topHighlights: HighlightWithBook[] = results.map((doc: Document) => ({
    content: doc.pageContent,
    bookTitle: bookTitleMap.get(doc.metadata.book_id as string) || "Unknown",
  }));

  const keywords = extractKeywords(
    topHighlights.map((h) => h.content).join(" "),
    config.rag.topKeywordsCount,
  );

  return { topHighlights, keywords };
}
