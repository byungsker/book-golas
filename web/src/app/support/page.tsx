"use client";

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">고객 지원</h1>

        <div className="prose prose-lg mx-auto">
          <h2 className="text-xl font-semibold mt-8 mb-4">문의하기</h2>
          <p className="text-gray-700 mb-4">
            Bookgolas 이용 중 문제가 발생하거나 궁금한 점이 있으시면 아래
            이메일로 문의해 주세요. 가능한 빨리 답변드리겠습니다.
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-700">
            <li>
              <strong>이메일</strong>:{" "}
              <a
                href="mailto:support@bookgolas.app"
                className="text-blue-600 hover:underline"
              >
                support@bookgolas.app
              </a>
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            자주 묻는 질문 (FAQ)
          </h2>

          <h3 className="text-lg font-medium mt-4 mb-2">
            Q. 계정은 어떻게 만드나요?
          </h3>
          <p className="text-gray-700 mb-4">
            앱을 처음 실행하면 Apple 로그인으로 간편하게 계정을 만들 수
            있습니다.
          </p>

          <h3 className="text-lg font-medium mt-4 mb-2">
            Q. Pro 구독은 어떻게 관리하나요?
          </h3>
          <p className="text-gray-700 mb-4">
            구독은 Apple ID를 통해 관리됩니다. iPhone 설정 &gt; Apple ID &gt;
            구독에서 변경하거나 해지할 수 있습니다.
          </p>

          <h3 className="text-lg font-medium mt-4 mb-2">
            Q. AI Recall이 작동하지 않아요.
          </h3>
          <p className="text-gray-700 mb-4">
            AI Recall은 인터넷 연결이 필요합니다. Wi-Fi 또는 셀룰러 데이터
            연결을 확인해 주세요. 문제가 지속되면 위 이메일로 문의해 주세요.
          </p>

          <h3 className="text-lg font-medium mt-4 mb-2">
            Q. 데이터를 백업할 수 있나요?
          </h3>
          <p className="text-gray-700 mb-4">
            모든 독서 기록과 노트는 클라우드에 자동 동기화됩니다. 동일한
            Apple 계정으로 로그인하면 다른 기기에서도 데이터를 이용할 수
            있습니다.
          </p>

          <h3 className="text-lg font-medium mt-4 mb-2">
            Q. 계정을 삭제하고 싶어요.
          </h3>
          <p className="text-gray-700 mb-4">
            앱 내 설정 &gt; 계정 삭제에서 직접 삭제할 수 있습니다. 삭제된
            데이터는 복구할 수 없으니 신중하게 결정해 주세요. 추가 도움이
            필요하면 support@bookgolas.app으로 문의해 주세요.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">관련 링크</h2>
          <ul className="list-disc pl-6 mb-4 text-gray-700">
            <li>
              <a href="/privacy" className="text-blue-600 hover:underline">
                개인정보 처리방침
              </a>
            </li>
            <li>
              <a href="/terms" className="text-blue-600 hover:underline">
                서비스 이용약관
              </a>
            </li>
          </ul>
        </div>

        <div className="mt-12 text-center text-sm text-gray-500">
          <p>© 2026 Bookgolas. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
