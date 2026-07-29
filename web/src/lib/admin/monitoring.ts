import type {
  AdminMonitoringMetrics,
  MetricValue,
} from "@/types/monitoring";

export function percentage(
  numerator: MetricValue,
  denominator: MetricValue
): number | null {
  if (numerator === null || denominator === null || denominator <= 0) {
    return null;
  }

  return Math.round((numerator / denominator) * 1000) / 10;
}

export function formatMetric(value: MetricValue): string {
  return value === null ? "연결 필요" : value.toLocaleString("ko-KR");
}

export function formatPercentage(value: number | null): string {
  return value === null ? "계산 불가" : `${value.toFixed(1)}%`;
}

export function formatGeneratedAt(value: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(new Date(value))
    .reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});

  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute} KST`;
}

export function getNextAction(metrics: AdminMonitoringMetrics): {
  title: string;
  description: string;
} {
  const activeUsers = metrics.users.active_7d;

  if (activeUsers === null) {
    return {
      title: "활성 사용자 집계를 먼저 연결하세요",
      description:
        "성장 지표 RPC가 배포되면 사용자 식별정보를 노출하지 않고 최근 7일 활성 사용자를 확인할 수 있습니다.",
    };
  }

  if (activeUsers < 30) {
    return {
      title: "표본을 늘리고 추세만 관찰하세요",
      description:
        "최근 7일 활성 사용자가 30명 미만입니다. 비율 최적화보다 첫 독서 기록까지의 사용성 문제를 직접 관찰하는 편이 안전합니다.",
    };
  }

  if ((metrics.books.created_7d ?? 0) === 0) {
    return {
      title: "책 등록 진입 흐름을 점검하세요",
      description:
        "최근 7일 책 등록이 없습니다. 검색, 직접 입력, 표지 촬영 흐름에서 이탈 지점을 확인하세요.",
    };
  }

  if ((metrics.reading.records_7d ?? 0) < (metrics.books.created_7d ?? 0)) {
    return {
      title: "첫 독서 기록 전환을 개선하세요",
      description:
        "최근 책 등록보다 독서 기록 수가 적습니다. 등록 직후 첫 페이지 기록으로 이어지는 안내를 우선 점검하세요.",
    };
  }

  return {
    title: "AI Recall 재사용 경험을 관찰하세요",
    description:
      "핵심 독서 행동은 발생하고 있습니다. 독서 기록이 실제 Recall 검색으로 이어지는지 사용자 인터뷰와 함께 확인하세요.",
  };
}
