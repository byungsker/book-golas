"use client";

import { BookOpen, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConsumerDialogContent as DialogContent } from "@/components/consumer/consumer-dialog-content";
import { ConsumerButton } from "@/components/consumer/blab-primitives";
import {
  AiInsightsSchema,
  AiMindMapSchema,
  AiRecommendationsSchema,
  type AiInsights,
  type AiMindMap,
  type AiRecommendations,
  type AiArtifactKind,
  type BookRecommendation,
} from "@/lib/product/contracts";

type AiArtifactContentProps = {
  readonly artifact: AiMindMap | AiInsights | AiRecommendations;
  readonly kind: AiArtifactKind;
  readonly onSelectRecommendation: (recommendation: BookRecommendation) => void;
};

export function AiArtifactContent({ artifact, kind, onSelectRecommendation }: AiArtifactContentProps) {
  const t = useTranslations("consumer.aiArtifacts");
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  switch (kind) {
    case "mindmap": {
      const mindMap = AiMindMapSchema.parse(artifact);
      const selectedCluster = mindMap.clusters.find((cluster) => cluster.id === selectedClusterId) ?? null;
      const selectedNode = mindMap.clusters.flatMap((cluster) => cluster.nodes.map((node) => ({ node, cluster }))).find(({ node }) => node.id === selectedNodeId) ?? null;
      return (
        <div data-testid="ai-artifacts-mindmap-content" className="grid gap-4">
          {mindMap.clusters.map((cluster) => (
            <section key={cluster.id} className="rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface)] p-4" data-testid="ai-artifacts-mindmap-cluster">
              <button type="button" className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" onClick={() => setSelectedClusterId(cluster.id)} data-testid="mind-map-cluster-open"><span className="text-lg font-semibold">{cluster.name}</span><ChevronRight aria-hidden="true" className="shrink-0 text-[var(--blab-text-tertiary)]" size={18} /></button>
              <p className="mt-2 text-sm leading-6 text-[var(--blab-text-secondary)]">{cluster.summary}</p>
              <div className="mt-4 grid gap-2">
                {cluster.nodes.map((node) => (
                  <button type="button" key={node.id} className="rounded-xl border border-[var(--blab-glass-border)] p-3 text-left hover:bg-[var(--blab-glass-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" onClick={() => setSelectedNodeId(node.id)} data-testid="ai-artifacts-mindmap-node">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--blab-color-primary)]">{t(`mindmap.nodeTypes.${node.type}`)}</p>
                    <p className="mt-1 text-sm leading-6">{node.content}</p>
                    {node.pageNumber ? <p className="mt-1 text-xs text-[var(--blab-text-tertiary)]">{t("mindmap.page", { page: node.pageNumber })}</p> : null}
                  </button>
                ))}
              </div>
            </section>
          ))}
          {mindMap.connections.length > 0 ? (
            <section className="rounded-2xl border border-[var(--blab-glass-border)] p-4" data-testid="ai-artifacts-mindmap-connections">
              <h3 className="text-sm font-semibold">{t("mindmap.connections")}</h3>
              <ul className="mt-3 grid gap-2 text-sm text-[var(--blab-text-secondary)]">
                {mindMap.connections.map((connection) => <li key={`${connection.fromNodeId}-${connection.toNodeId}`} className="rounded-xl bg-[var(--blab-surface)] p-3">{connection.fromNodeId} → {connection.toNodeId}: {connection.reason}</li>)}
              </ul>
            </section>
          ) : null}
          <Dialog open={selectedCluster !== null} onOpenChange={(open) => { if (!open) setSelectedClusterId(null); }}>
            <DialogContent className="bg-[var(--blab-surface-elevated)] text-[var(--blab-text-primary)]" data-testid="mind-map-cluster-detail">
              <DialogHeader><DialogTitle>{selectedCluster?.name}</DialogTitle><DialogDescription>{selectedCluster?.summary}</DialogDescription></DialogHeader>
              <p className="text-sm text-[var(--blab-text-secondary)]">{t("mindmap.clusterCount", { count: selectedCluster?.nodes.length ?? 0 })}</p>
              <DialogFooter><ConsumerButton type="button" variant="primary" text={t("mindmap.closeDetail")} onClick={() => setSelectedClusterId(null)} data-testid="mind-map-cluster-close" /></DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={selectedNode !== null} onOpenChange={(open) => { if (!open) setSelectedNodeId(null); }}>
            <DialogContent className="bg-[var(--blab-surface-elevated)] text-[var(--blab-text-primary)]" data-testid="mind-map-leaf-detail">
              <DialogHeader><DialogTitle>{selectedNode ? t(`mindmap.nodeTypes.${selectedNode.node.type}`) : ""}</DialogTitle><DialogDescription>{selectedNode?.cluster.name}</DialogDescription></DialogHeader>
              <p className="rounded-xl bg-[var(--blab-surface)] p-4 text-sm leading-6">{selectedNode?.node.content}</p>
              {selectedNode?.node.pageNumber ? <p className="text-sm text-[var(--blab-text-tertiary)]">{t("mindmap.page", { page: selectedNode.node.pageNumber })}</p> : null}
              <DialogFooter><ConsumerButton type="button" variant="primary" text={t("mindmap.closeDetail")} onClick={() => setSelectedNodeId(null)} data-testid="mind-map-leaf-close" /></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      );
    }
    case "insights": {
      const insights = AiInsightsSchema.parse(artifact);
      return (
        <div data-testid="ai-artifacts-insights-content" className="grid gap-3">
          {insights.map((insight) => (
            <article key={insight.id} className="rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface)] p-4" data-testid="ai-artifacts-insight">
              <div className="flex items-start justify-between gap-3"><h3 className="text-lg font-semibold">{insight.title}</h3><span className="rounded-full bg-[var(--blab-color-primary)]/10 px-2.5 py-1 text-xs text-[var(--blab-color-primary)]">{t(`insights.categories.${insight.category}`)}</span></div>
              <p className="mt-3 text-sm leading-6 text-[var(--blab-text-secondary)]">{insight.description}</p>
            </article>
          ))}
        </div>
      );
    }
    case "recommendations": {
      const recommendations = AiRecommendationsSchema.parse(artifact);
      return (
        <div data-testid="ai-artifacts-recommendations-content" className="grid gap-3 sm:grid-cols-2">
          {recommendations.recommendations.map((recommendation) => (
            <button key={`${recommendation.title}-${recommendation.author}`} type="button" className="flex min-h-36 items-start gap-3 rounded-2xl border border-[var(--blab-glass-border)] bg-[var(--blab-surface)] p-4 text-left transition hover:-translate-y-0.5 hover:bg-[var(--blab-glass-fill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blab-color-primary)]" onClick={() => onSelectRecommendation(recommendation)} data-testid="ai-artifacts-recommendation">
              <BookOpen aria-hidden="true" className="mt-1 shrink-0 text-[var(--blab-color-primary)]" size={22} />
              <span className="min-w-0"><strong className="block break-words text-base font-semibold">{recommendation.title}</strong><span className="mt-1 block text-sm text-[var(--blab-text-tertiary)]">{recommendation.author}</span><span className="mt-3 block text-sm leading-6 text-[var(--blab-text-secondary)]">{recommendation.reason}</span><span className="mt-3 flex flex-wrap gap-1.5">{recommendation.keywords.slice(0, 3).map((keyword) => <span key={keyword} className="rounded-full bg-[var(--blab-color-primary)]/10 px-2 py-1 text-xs text-[var(--blab-color-primary)]">{keyword}</span>)}</span></span><ChevronRight aria-hidden="true" className="mt-1 shrink-0 text-[var(--blab-text-tertiary)]" size={18} />
            </button>
          ))}
        </div>
      );
    }
  }
}
