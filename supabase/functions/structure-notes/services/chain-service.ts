import { ChatOpenAI } from "@langchain/openai";
import {
  classificationPrompt,
  ClassificationResult,
} from "../prompts/classification.ts";
import { summaryPrompt, SummaryResult } from "../prompts/summary.ts";
import { connectionPrompt, ConnectionResult } from "../prompts/connection.ts";
import type { Cluster, Connection, Node, NoteStructure } from "../types.ts";
import {
  AI_MAX_OUTPUT_TOKENS,
  AI_PROVIDER_TIMEOUT_MS,
} from "../../_shared/ai-usage.ts";
import type {
  AiBudgetContext,
  AiProviderOperation,
} from "../../_shared/ai-usage.ts";

export interface ContentItem {
  id: string;
  content_type: string;
  content_text: string;
  page_number: number | null;
  source_id: string | null;
}

interface ChainInput {
  bookId: string;
  contents: ContentItem[];
}

export function prepareProviderContents(contents: ContentItem[]) {
  const providerContents = contents.map((content, index) => ({
    ...content,
    id: `record-${index + 1}`,
  }));
  return {
    providerContents,
    storedIdByProviderId: new Map(
      providerContents.map((content, index) => [
        content.id,
        contents[index].id,
      ]),
    ),
  };
}

export function formatProviderContents(contents: ContentItem[]): string {
  return contents
    .map((content) => {
      const typeLabel = content.content_type === "highlight"
        ? "하이라이트"
        : content.content_type === "note"
        ? "메모"
        : "사진 속 텍스트";
      const pageInfo = content.page_number
        ? ` (${content.page_number}페이지)`
        : "";
      return `[${content.id}] ${typeLabel}${pageInfo}:\n${content.content_text}`;
    })
    .join("\n\n---\n\n");
}

export function remapResolvedConnections(
  connections: Connection[],
  storedIdByProviderId: ReadonlyMap<string, string>,
): Connection[] {
  return connections.flatMap((connection) => {
    const fromNodeId = storedIdByProviderId.get(connection.fromNodeId);
    const toNodeId = storedIdByProviderId.get(connection.toNodeId);
    if (!fromNodeId || !toNodeId) return [];
    return [{ ...connection, fromNodeId, toNodeId }];
  });
}

export class ChainService {
  private llm: ChatOpenAI;
  private readonly runProviderCall: <T>(
    input: string,
    context: AiBudgetContext,
    operation: AiProviderOperation<T>,
  ) => Promise<T>;

  constructor(
    apiKey: string,
    runProviderCall: <T>(
      input: string,
      context: AiBudgetContext,
      operation: AiProviderOperation<T>,
    ) => Promise<T>,
  ) {
    this.runProviderCall = runProviderCall;
    this.llm = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: "gpt-4o-mini",
      temperature: 0.3,
      maxTokens: AI_MAX_OUTPUT_TOKENS,
      maxRetries: 0,
      timeout: AI_PROVIDER_TIMEOUT_MS,
    });
  }

  async generateStructure(input: ChainInput): Promise<NoteStructure> {
    const { bookId, contents } = input;
    const { providerContents, storedIdByProviderId } = prepareProviderContents(
      contents,
    );

    const nodes: Node[] = providerContents.map((c) => ({
      id: c.id,
      type: c.content_type as "highlight" | "note" | "photo_ocr",
      content: c.content_text,
      pageNumber: c.page_number ?? undefined,
      sourceId: c.source_id ?? undefined,
    }));

    const contentsFormatted = formatProviderContents(providerContents);

    const classificationResult = await this.runClassification(
      contentsFormatted,
    );

    const clusteredContents = this.formatClusteredContents(
      classificationResult,
      providerContents,
    );
    const summaryResult = await this.runSummary(clusteredContents);

    const summarizedClusters = this.formatSummarizedClusters(
      classificationResult,
      summaryResult,
      providerContents,
    );
    const connectionResult = await this.runConnection(summarizedClusters);

    const clusters = this.buildClusters(
      classificationResult,
      summaryResult,
      nodes,
    ).map((cluster) => ({
      ...cluster,
      nodes: cluster.nodes.map((node) => ({
        ...node,
        id: storedIdByProviderId.get(node.id) ?? node.id,
      })),
    }));
    const connections = remapResolvedConnections(
      this.buildConnections(connectionResult),
      storedIdByProviderId,
    );

    return {
      bookId,
      generatedAt: new Date().toISOString(),
      clusters,
      connections,
    };
  }

  private async runClassification(
    contents: string,
  ): Promise<ClassificationResult> {
    const formattedPrompt = await classificationPrompt.format({ contents });
    const response = await this.runProviderCall(
      formattedPrompt,
      {
        functionName: "structure-notes",
        feature: "structure-notes.classification",
        provider: "open_ai",
        model: "gpt-4o-mini",
        promptVersion: "structure-classification-v1",
        maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
        requireOutputTokens: true,
      },
      async () => {
        const value = await this.llm.invoke(formattedPrompt);
        return { value, usage: value };
      },
    );
    return this.parseJsonResponse<ClassificationResult>(
      response.content as string,
    );
  }

  private formatClusteredContents(
    classification: ClassificationResult,
    contents: ContentItem[],
  ): string {
    const contentMap = new Map(contents.map((c) => [c.id, c]));

    return classification.clusters
      .map((cluster) => {
        const clusterContents = cluster.nodeIds
          .map((nodeId) => {
            const content = contentMap.get(nodeId);
            if (!content) return null;
            return `  - [${nodeId}]: ${
              content.content_text.substring(0, 200)
            }...`;
          })
          .filter(Boolean)
          .join("\n");

        return `## 클러스터: ${cluster.name} (${cluster.clusterId})\n${clusterContents}`;
      })
      .join("\n\n");
  }

  private async runSummary(clusteredContents: string): Promise<SummaryResult> {
    const formattedPrompt = await summaryPrompt.format({ clusteredContents });
    const response = await this.runProviderCall(
      formattedPrompt,
      {
        functionName: "structure-notes",
        feature: "structure-notes.summary",
        provider: "open_ai",
        model: "gpt-4o-mini",
        promptVersion: "structure-summary-v1",
        maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
        requireOutputTokens: true,
      },
      async () => {
        const value = await this.llm.invoke(formattedPrompt);
        return { value, usage: value };
      },
    );
    return this.parseJsonResponse<SummaryResult>(response.content as string);
  }

  private formatSummarizedClusters(
    classification: ClassificationResult,
    summary: SummaryResult,
    contents: ContentItem[],
  ): string {
    const contentMap = new Map(contents.map((c) => [c.id, c]));
    const summaryMap = new Map(summary.summaries.map((s) => [s.clusterId, s]));

    return classification.clusters
      .map((cluster) => {
        const clusterSummary = summaryMap.get(cluster.clusterId);
        const clusterContents = cluster.nodeIds
          .map((nodeId) => {
            const content = contentMap.get(nodeId);
            if (!content) return null;
            return `  - [${nodeId}]: ${
              content.content_text.substring(0, 150)
            }...`;
          })
          .filter(Boolean)
          .join("\n");

        return `## 클러스터: ${cluster.name} (${cluster.clusterId})
요약: ${clusterSummary?.summary || "요약 없음"}
키워드: ${clusterSummary?.keywords.join(", ") || "없음"}
기록들:
${clusterContents}`;
      })
      .join("\n\n");
  }

  private async runConnection(
    summarizedClusters: string,
  ): Promise<ConnectionResult> {
    const formattedPrompt = await connectionPrompt.format({
      summarizedClusters,
    });
    const response = await this.runProviderCall(
      formattedPrompt,
      {
        functionName: "structure-notes",
        feature: "structure-notes.connection",
        provider: "open_ai",
        model: "gpt-4o-mini",
        promptVersion: "structure-connection-v1",
        maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
        requireOutputTokens: true,
      },
      async () => {
        const value = await this.llm.invoke(formattedPrompt);
        return { value, usage: value };
      },
    );
    return this.parseJsonResponse<ConnectionResult>(response.content as string);
  }

  private buildClusters(
    classification: ClassificationResult,
    summary: SummaryResult,
    nodes: Node[],
  ): Cluster[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const summaryMap = new Map(summary.summaries.map((s) => [s.clusterId, s]));

    return classification.clusters.map((cluster) => {
      const clusterSummary = summaryMap.get(cluster.clusterId);
      const clusterNodes = cluster.nodeIds
        .map((nodeId) => nodeMap.get(nodeId))
        .filter((n): n is Node => n !== undefined);

      return {
        id: cluster.clusterId,
        name: cluster.name,
        summary: clusterSummary?.summary || "",
        nodes: clusterNodes,
      };
    });
  }

  private buildConnections(connectionResult: ConnectionResult): Connection[] {
    return connectionResult.connections.map((conn) => ({
      fromNodeId: conn.fromNodeId,
      toNodeId: conn.toNodeId,
      reason: conn.reason,
    }));
  }

  private parseJsonResponse<T>(response: string): T {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("LLM response is not in JSON format");
    }
    return JSON.parse(jsonMatch[0]) as T;
  }
}
