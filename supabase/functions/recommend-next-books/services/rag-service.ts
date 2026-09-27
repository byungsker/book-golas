import { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { config } from "../config.ts";
import { extractKeywords } from "../utils/keyword-extractor.ts";
import {
  ContractError,
  fetchProvider,
  MAX_PROVIDER_RESPONSE_BYTES,
  PROVIDER_TIMEOUT_MS,
} from "../../_shared/consumer-contract.ts";

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
  userId: string
): Promise<UserInterests> {
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: config.openai.apiKey,
    timeout: PROVIDER_TIMEOUT_MS,
    maxRetries: 0,
    configuration: {
      fetch: (input, init) => fetchProvider(
        input,
        init ?? {},
        PROVIDER_TIMEOUT_MS,
        MAX_PROVIDER_RESPONSE_BYTES,
      ),
    },
  });

  const vectorStore = new SupabaseVectorStore(embeddings, {
    client: supabase,
    tableName: "reading_content_embeddings",
    queryName: "match_user_interests",
  });

  const interestQuery = "독서에서 중요하게 생각하는 주제와 개념";

  const results = await vectorStore.similaritySearch(
    interestQuery,
    config.rag.topHighlightsCount,
    { user_id: userId }
  );

  if (results.length === 0) {
    return { topHighlights: [], keywords: [] };
  }

  const bookIds = [
    ...new Set(results.map((doc: Document) => doc.metadata.book_id as string)),
  ];

  const { data: books, error: booksError } = await supabase
    .from("books")
    .select("id, title")
    .in("id", bookIds)
    .eq("user_id", userId)
    .is("deleted_at", null);
  if (booksError) throw new ContractError(503, "unavailable", "Reading data is unavailable");

  const bookTitleMap = new Map<string, string>(
    books?.map((b: { id: string; title: string }) => [b.id, b.title]) || []
  );

  const activeResults = results.filter((doc: Document) => bookTitleMap.has(doc.metadata.book_id as string));
  const topHighlights: HighlightWithBook[] = activeResults.map((doc: Document) => ({
    content: doc.pageContent,
    bookTitle: bookTitleMap.get(doc.metadata.book_id as string) || "Unknown",
  }));

  const keywords = extractKeywords(
    topHighlights.map((h) => h.content).join(" "),
    config.rag.topKeywordsCount
  );

  return { topHighlights, keywords };
}
