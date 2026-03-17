import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-white">
          개인정보 처리방침
        </h1>

        <div className="prose prose-lg mx-auto">
          <p className="text-gray-400 mb-4">
            <strong className="text-gray-300">최종 업데이트</strong>: 2026년 2월
            1일
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-100">
            1. 개인정보 수집 및 이용 목적
          </h2>
          <p className="text-gray-300 mb-4">
            Bookgolas은 독서 관리 서비스를 제공하기 위해 다음과 같은 개인정보를
            수집합니다.
          </p>
          <h3 className="text-lg font-medium mt-4 mb-2 text-gray-200">
            수집하는 개인정보
          </h3>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li>
              <strong className="text-gray-200">이메일 주소</strong>: 회원가입 및
              로그인, 서비스 제공
            </li>
            <li>
              <strong className="text-gray-200">사용자 이름</strong>: 서비스 내
              식별 및 개인화
            </li>
            <li>
              <strong className="text-gray-200">독서 기록 데이터</strong>: 독서
              목표 설정 및 진행률 추적
            </li>
            <li>
              <strong className="text-gray-200">기기 정보</strong>: 앱 안정성 및
              성능 최적화
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-100">
            2. 개인정보 수집 방법
          </h2>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li>앱 내 회원가입 시 직접 입력</li>
            <li>서비스 이용 과정에서 자동 수집</li>
            <li>고객 지원 시 제공</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-100">
            3. 개인정보 제3자 제공
          </h2>
          <p className="text-gray-300 mb-4">
            Bookgolas은 사용자의 개인정보를 제3자에게 제공하지 않습니다. 단,
            사용자의 사전 동의가 있는 경우 또는 법령의 규정에 따른 경우를
            제외하고는 제3자에게 제공하지 않습니다.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-100">
            4. 개인정보 처리 위탁
          </h2>
          <p className="text-gray-300 mb-4">
            Bookgolas은 서비스 제공을 위해 다음과 같은 업체에 개인정보 처리를
            위탁합니다:
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li>
              <strong className="text-gray-200">Supabase</strong>: 데이터 저장 및
              관리
            </li>
            <li>
              <strong className="text-gray-200">RevenueCat</strong>: 인앱 구매
              관리
            </li>
            <li>
              <strong className="text-gray-200">Firebase</strong>: 푸시 알림
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-100">
            5. 개인정보 보호책임자
          </h2>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li>
              <strong className="text-gray-200">이름</strong>: 이병우
            </li>
            <li>
              <strong className="text-gray-200">이메일</strong>:
              support@bookgolas.com
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-100">
            6. 연락처
          </h2>
          <p className="text-gray-300 mb-4">
            개인정보 처리방침과 관련된 문의사항이 있으시면 언제든지 연락주시기
            바랍니다.
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li>
              <strong className="text-gray-200">이메일</strong>:
              support@bookgolas.com
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
