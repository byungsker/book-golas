import {
  AiConsentDisclosureSchema,
  type AiConsentDisclosure,
  type AiProvider,
} from "@/lib/product/contracts";

const disclosures: Record<AiProvider, Record<"ko" | "en", AiConsentDisclosure>> = {
  google_cloud_vision: {
    en: {
      locale: "en-US",
      title: "Allow Google Cloud Vision OCR?",
      description: "To extract text, the page image you choose is sent securely to Google Cloud Vision in the United States.",
      providerScope: "This choice applies whenever you use Google OCR.",
      triggerContext: {
        feature: "Extract text from this page image",
        data: "This page image and Korean/English language hints",
      },
      dataDescription: "Selected, captured, or cropped book page image and Korean/English language hints. The image is processed for text extraction and is not persisted by the online Vision service; request metadata may be logged temporarily for security and operations.",
      optionalNotice: "This optional overseas transfer can be declined. If declined, Google OCR is unavailable, but manual text entry and other reading-management features remain available. New OCR requests started after withdrawal is confirmed do not transmit data.",
      recipient: "Google Cloud Vision · United States",
    },
    ko: {
      locale: "ko-KR",
      title: "Google Cloud Vision OCR을 허용할까요?",
      description: "문자를 추출하기 위해 선택한 페이지 이미지를 미국의 Google Cloud Vision으로 안전하게 전송합니다.",
      providerScope: "이 선택은 Google OCR을 사용할 때마다 적용됩니다.",
      triggerContext: {
        feature: "이 페이지 이미지에서 문자 추출",
        data: "이 페이지 이미지와 한국어·영어 언어 힌트",
      },
      dataDescription: "선택·촬영·자른 책 페이지 이미지와 한국어·영어 언어 힌트를 문자 추출에 사용합니다. 이미지는 온라인 Vision 서비스의 메모리에서 처리되고 저장되지 않으며, 요청 메타데이터는 보안·운영을 위해 일시적으로 기록될 수 있습니다.",
      optionalNotice: "선택적인 국외 이전에 동의하지 않을 수 있습니다. 거부하면 Google OCR은 사용할 수 없지만 직접 텍스트를 입력하고 다른 독서 관리 기능을 이용할 수 있습니다. 철회 성공 확인 뒤 시작하는 새 OCR 요청은 데이터를 전송하지 않습니다.",
      recipient: "Google Cloud Vision · 미국",
    },
  },
  open_ai: {
    en: {
      locale: "en-US",
      title: "Allow OpenAI-powered features?",
      description: "Bookgolas uses OpenAI in the United States for the AI feature you choose. Only the data described below is sent after you agree.",
      providerScope: "This provider-wide choice applies to Recall, review drafts, reading insights, mind maps, recommendations, keyword extraction, writing support, and semantic-search embeddings.",
      triggerContext: {
        feature: "Use the requested OpenAI feature",
        data: "The question, book details, and reading records needed for that feature",
      },
      dataDescription: "Depending on the feature: book title, author, genre, status and dates, page progress, rating, review, notes, highlights, OCR text, reading pace, goals, attempts, engagement statistics, and your question. Data is sent with TLS when an AI feature runs; API input and output are not used for model training by default.",
      optionalNotice: "This optional overseas transfer can be declined. If declined, OpenAI search, summaries, insights, recommendations, writing assistance, and semantic search are unavailable while other reading-management features remain available. New requests started after withdrawal is confirmed do not transmit data; a request already underway may finish.",
      recipient: "OpenAI OpCo, LLC · United States",
    },
    ko: {
      locale: "ko-KR",
      title: "OpenAI 기반 기능을 허용할까요?",
      description: "북골라스는 선택한 AI 기능에 미국의 OpenAI를 사용합니다. 동의한 뒤 아래에 안내된 데이터만 전송합니다.",
      providerScope: "이 제공자 단위 선택은 OpenAI 회상 검색·리뷰 초안·독서 인사이트·마인드맵·추천·키워드 추출·글쓰기 지원·의미 검색 임베딩에 함께 적용됩니다.",
      triggerContext: {
        feature: "요청한 OpenAI 기능 사용",
        data: "이번 기능에 필요한 질문, 책 정보와 독서 기록",
      },
      dataDescription: "기능에 따라 책 제목·저자·장르, 독서 상태·날짜·페이지 진행률, 평점·리뷰, 메모·하이라이트·OCR 텍스트, 독서 속도·목표·시도·참여 통계와 입력한 질문을 사용합니다. AI 기능 실행 시 TLS로 전송하며 API 입출력은 기본적으로 모델 학습에 사용되지 않습니다.",
      optionalNotice: "선택적인 국외 이전에 동의하지 않을 수 있습니다. 거부하면 OpenAI 검색·요약·인사이트·추천·글쓰기 지원·의미 검색은 사용할 수 없지만 다른 독서 관리 기능은 이용할 수 있습니다. 철회 성공 확인 뒤 시작하는 새 요청은 전송되지 않으며 이미 시작된 요청은 완료될 수 있습니다.",
      recipient: "OpenAI OpCo, LLC · 미국",
    },
  },
};

export function getAiConsentDisclosure(
  provider: AiProvider,
  locale: "ko" | "en",
): AiConsentDisclosure {
  return AiConsentDisclosureSchema.parse(disclosures[provider][locale]);
}
