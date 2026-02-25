import { ChatOpenAI } from "@langchain/openai";
import {
  classificationPrompt,
  ClassificationResult,
} from "../prompts/classification.ts";
import { summaryPrompt, SummaryResult } from "../prompts/summary.ts";
import { connectionPrompt, ConnectionResult } from "../prompts/connection.ts";
import type { NoteStructure, Cluster, Node, Connection } from "../types.ts";

interface ContentItem {
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

export class ChainService {
  private llm: ChatOpenAI;

  constructor(apiKey: string) {
    this.llm = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: "gpt-4o-mini",
      temperature: 0.3,
    });
  }

  async generateStructure(input: ChainInput): Promise<NoteStructure> {
    const { bookId, contents } = input;

    const nodes: Node[] = contents.map((c) => ({
      id: c.id,
      type: c.content_type as "highlight" | "note" | "photo_ocr",
      content: c.content_text,
      pageNumber: c.page_number ?? undefined,
      sourceId: c.source_id ?? undefined,
    }));

    const contentsFormatted = this.formatContentsForPrompt(contents);

    const classificationResult = await this.runClassification(contentsFormatted);

    const clusteredContents = this.formatClusteredContents(
      classificationResult,
      contents
    );
    const summaryResult = await this.runSummary(clusteredContents);

    const summarizedClusters = this.formatSummarizedClusters(
      classificationResult,
      summaryResult,
      contents
    );
    const connectionResult = await this.runConnection(summarizedClusters);

    const clusters = this.buildClusters(
      classificationResult,
      summaryResult,
      nodes
    );
    const connections = this.buildConnections(connectionResult);

    return {
      bookId,
      generatedAt: new Date().toISOString(),
      clusters,
      connections,
    };
  }

  private formatContentsForPrompt(contents: ContentItem[]): string {
    return contents
      .map((c) => {
        const typeLabel =
          c.content_type === "highlight"
            ? "하이라이트"
            : c.content_type === "note"
            ? "메모"
            : "사진 속 텍스트";
        const pageInfo = c.page_number ? ` (${c.page_number}페이지)` : "";
        return `[${c.id}] ${typeLabel}${pageInfo}:\n${c.content_text}`;
      })
      .join("\n\n---\n\n");
  }

  private async runClassification(
    contents: string
  ): Promise<ClassificationResult> {
    const formattedPrompt = await classificationPrompt.format({ contents });
    const response = await this.llm.invoke(formattedPrompt);
    return this.parseJsonResponse<ClassificationResult>(response.content as string);
  }

  private formatClusteredContents(
    classification: ClassificationResult,
    contents: ContentItem[]
  ): string {
    const contentMap = new Map(contents.map((c) => [c.id, c]));

    return classification.clusters
      .map((cluster) => {
        const clusterContents = cluster.nodeIds
          .map((nodeId) => {
            const content = contentMap.get(nodeId);
            if (!content) return null;
            return `  - [${nodeId}]: ${content.content_text.substring(0, 200)}...`;
          })
          .filter(Boolean)
          .join("\n");

        return `## 클러스터: ${cluster.name} (${cluster.clusterId})\n${clusterContents}`;
      })
      .join("\n\n");
  }

  private async runSummary(clusteredContents: string): Promise<SummaryResult> {
    const formattedPrompt = await summaryPrompt.format({ clusteredContents });
    const response = await this.llm.invoke(formattedPrompt);
    return this.parseJsonResponse<SummaryResult>(response.content as string);
  }

  private formatSummarizedClusters(
    classification: ClassificationResult,
    summary: SummaryResult,
    contents: ContentItem[]
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
            return `  - [${nodeId}]: ${content.content_text.substring(0, 150)}...`;
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
    summarizedClusters: string
  ): Promise<ConnectionResult> {
    const formattedPrompt = await connectionPrompt.format({ summarizedClusters });
    const response = await this.llm.invoke(formattedPrompt);
    return this.parseJsonResponse<ConnectionResult>(response.content as string);
  }

  private buildClusters(
    classification: ClassificationResult,
    summary: SummaryResult,
    nodes: Node[]
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
