import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-white">
          서비스 이용약관
        </h1>

        <div className="prose prose-lg mx-auto">
          <p className="text-gray-400 mb-4">
            <strong className="text-gray-300">최종 업데이트</strong>: 2026년 2월
            1일
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-100">
            제1조 (목적)
          </h2>
          <p className="text-gray-300 mb-4">
            이 약관은 이병우(이하 &quot;운영자&quot;)가 운영하는 Bookgolas
            서비스(이하 &quot;서비스&quot;)의 이용 조건과 운영자 및 이용자의 권리,
            의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-100">
            제2조 (정의)
          </h2>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li>
              &quot;서비스&quot;란 운영자가 제공하는 Bookgolas 독서 관리 앱 및
              관련 서비스를 의미합니다.
            </li>
            <li>
              &quot;이용자&quot;란 이 약관에 동의하고 서비스를 이용하는 자를
              의미합니다.
            </li>
            <li>
              &quot;회원&quot;이란 서비스에 회원가입을 한 이용자를 의미합니다.
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-100">
            제3조 (약관의 효력 및 변경)
          </h2>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li>
              이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게
              공지함으로써 효력을 발생합니다.
            </li>
            <li>
              운영자는 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수
              있습니다.
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-100">
            제4조 (서비스 이용)
          </h2>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li>서비스는 연중무휴 1일 24시간 제공함을 원칙으로 합니다.</li>
            <li>
              서비스 이용은 회원의 가입 절차에 따른 회원 자격에 한합니다.
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-100">
            제5조 (회원가입)
          </h2>
          <p className="text-gray-300 mb-4">
            회원은 서비스에서 제공하는 회원가입 양식에 따라 정보를 입력하여
            회원가입을 신청합니다. 운영자는 허위의 정보를 기재한 경우 회원가입을
            거부할 수 있습니다.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-100">
            제6조 (개인정보 보호)
          </h2>
          <p className="text-gray-300 mb-4">
            운영자는 이용자의 개인정보를 「개인정보 보호법」에 따라 보호하며,
            개인정보의 수집, 이용, 제공 등에 관한 사항은 별도의 개인정보
            처리방침에 따릅니다.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-100">
            제7조 (유료 서비스 및 결제)
          </h2>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li>서비스 내 일부 기능은 유료로 제공될 수 있습니다.</li>
            <li>
              인앱 구매를 통해 결제가 이루어지며, 결제 처리는 해당
              플랫폼(Apple, Google)의 정책에 따릅니다.
            </li>
            <li>
              구독 서비스의 경우 이용자는 구독 기간 종료 전까지 해지하지 않는 경우
              자동 갱신됩니다.
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-100">
            제8조 (구독 해지 및 환불)
          </h2>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li>
              구독 해지는 각 앱스토어의 설정에서 직접 진행해야 합니다.
            </li>
            <li>
              이미 결제된 금액에 대한 환불은 앱스토어의 정책에 따릅니다.
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-100">
            제9조 (면책)
          </h2>
          <ul className="list-disc pl-6 mb-4 text-gray-300">
            <li>
              운영자는 천재지변, 전쟁, 기간통신사업자의 서비스 중단 등
              불가항력적인 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.
            </li>
            <li>
              운영자는 이용자가 서비스를 이용하여 기대한 이익을 얻지 못하거나
              서비스를 통해 얻은 정보로 인해 발생한 손해에 대해 책임을 지지
              않습니다.
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-100">
            제10조 (준거법 및 관할법원)
          </h2>
          <p className="text-gray-300 mb-4">
            이 약관은 대한민국 법률에 따라 규명되고 해석됩니다. 서비스 이용에 관한
            분쟁으로 인한 소송은 서울중앙지방법원을 제1심 관할법원으로 합니다.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-100">
            제11조 (운영자 정보)
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
        </div>

        <div className="mt-12 p-4 bg-white/5 rounded-lg">
          <p className="text-sm text-gray-400">
            <strong className="text-gray-300">참고</strong>: 본 서비스는 인앱
            구매를 통해 제공되며, Apple 및 Google의 결제 정책을 따릅니다.
          </p>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2026 Bookgolas. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
