import { ExternalLink, KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AiMonitorGroup } from "@/lib/ai-monitor";

type ProviderDirectoryEntry = {
  readonly key: string;
  readonly name: string;
  readonly consoleUrl: string;
  readonly usageUrl: string;
};

const providerDirectory: readonly ProviderDirectoryEntry[] = [
  { key: "openai", name: "OpenAI", consoleUrl: "https://platform.openai.com/", usageUrl: "https://platform.openai.com/usage" },
  { key: "anthropic", name: "Anthropic", consoleUrl: "https://console.anthropic.com/", usageUrl: "https://console.anthropic.com/settings/usage" },
  { key: "google", name: "Google Gemini", consoleUrl: "https://console.cloud.google.com/vertex-ai", usageUrl: "https://console.cloud.google.com/usage" },
];

export function ProviderConnections({ providers }: { readonly providers: readonly AiMonitorGroup[] }) {
  const usageByProvider = new Map(providers.map((provider) => [provider.key, provider]));
  return (
    <section aria-labelledby="provider-connections" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="provider-connections" className="font-semibold text-foreground">Provider 연결 정보</h2>
          <p className="text-sm text-muted-foreground">현재 데이터가 어느 계정·콘솔 경계를 기준으로 만들어졌는지 확인합니다.</p>
        </div>
        <Badge variant="outline">Preview fixture</Badge>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {providerDirectory.map((provider) => {
          const usage = usageByProvider.get(provider.key);
          return (
            <Card key={provider.key}>
              <CardHeader className="gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <KeyRound aria-hidden="true" className="size-4 text-muted-foreground" />
                    <CardTitle>{provider.name}</CardTitle>
                  </div>
                  <Badge variant="outline">{usage ? `${usage.requests}건` : "기간 내 없음"}</Badge>
                </div>
                <CardDescription>Preview에서는 실제 API 자격 증명이나 청구 계정을 연결하지 않습니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <dl className="grid gap-2">
                  <div className="flex items-start justify-between gap-3"><dt className="text-muted-foreground">연결 계정</dt><dd className="text-right font-medium">Preview fixture</dd></div>
                  <div className="flex items-start justify-between gap-3"><dt className="text-muted-foreground">연결 상태</dt><dd className="text-right font-medium">실계정 미연결</dd></div>
                  <div className="flex items-start justify-between gap-3"><dt className="text-muted-foreground">현재 사용량</dt><dd className="text-right tabular-nums">{usage ? `${usage.totalTokens.toLocaleString("ko-KR")} tokens` : "—"}</dd></div>
                </dl>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a href={provider.consoleUrl} target="_blank" rel="noreferrer">개발자 센터<ExternalLink aria-hidden="true" /></a>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <a href={provider.usageUrl} target="_blank" rel="noreferrer">사용량·결제<ExternalLink aria-hidden="true" /></a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
