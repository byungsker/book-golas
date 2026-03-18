class LegalContent {
  LegalContent._();

  static String _baseStyle(bool isDark) {
    final bg = isDark ? '#121418' : '#ffffff';
    final text = isDark ? '#e0e0e0' : '#333333';
    final heading = isDark ? '#ffffff' : '#111111';
    final border = isDark ? '#2a2d35' : '#e5e7eb';
    return '''
      body {
        font-family: system-ui, -apple-system, sans-serif;
        background-color: $bg;
        color: $text;
        padding: 24px 20px 48px;
        margin: 0;
        font-size: 15px;
        line-height: 1.7;
        word-break: keep-all;
      }
      h1 {
        font-size: 22px;
        font-weight: 700;
        color: $heading;
        margin: 0 0 8px;
      }
      h2 {
        font-size: 17px;
        font-weight: 600;
        color: $heading;
        margin: 28px 0 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid $border;
      }
      p, li { margin: 6px 0; }
      ul { padding-left: 20px; }
      .subtitle {
        font-size: 13px;
        color: ${isDark ? '#888' : '#999'};
        margin-bottom: 24px;
      }
      .empty {
        text-align: center;
        padding: 80px 20px;
        color: ${isDark ? '#666' : '#aaa'};
        font-size: 16px;
      }
    ''';
  }

  static String termsOfService(String locale, bool isDark) {
    if (locale == 'ko') {
      return '''
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${_baseStyle(isDark)}</style></head>
<body>
<h1>서비스 이용약관</h1>
<p class="subtitle">시행일: 2026년 1월 1일</p>

<h2>제1조 (목적)</h2>
<p>본 약관은 북골라스(이하 "서비스")가 제공하는 독서 기록 및 관리 서비스의 이용 조건과 절차, 회사와 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>

<h2>제2조 (서비스 내용)</h2>
<p>서비스는 다음과 같은 기능을 제공합니다:</p>
<ul>
<li>독서 기록 및 진행률 관리</li>
<li>독서 목표 설정 및 달성 추적</li>
<li>하이라이트, 메모, 사진 기록</li>
<li>AI 기반 독서 기록 검색 및 분석</li>
<li>독후감 작성 및 관리</li>
<li>독서 통계 및 인사이트</li>
</ul>

<h2>제3조 (이용자의 의무)</h2>
<ul>
<li>이용자는 관계 법령, 본 약관의 규정, 이용안내 및 서비스와 관련하여 공지한 사항을 준수하여야 합니다.</li>
<li>이용자는 서비스를 이용하여 얻은 정보를 서비스의 사전 동의 없이 복제, 배포, 방송 또는 상업적으로 이용할 수 없습니다.</li>
<li>이용자는 타인의 개인정보를 침해하거나 서비스의 정상적인 운영을 방해하는 행위를 하여서는 안 됩니다.</li>
<li>이용자는 자신의 계정 정보를 안전하게 관리할 책임이 있습니다.</li>
</ul>

<h2>제4조 (서비스의 변경 및 중단)</h2>
<p>서비스는 운영상, 기술상의 필요에 따라 제공하는 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다. 이 경우 변경 또는 중단 사유와 내용을 사전에 공지합니다.</p>

<h2>제5조 (면책조항)</h2>
<ul>
<li>서비스는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력적인 사유로 서비스를 제공할 수 없는 경우 책임이 면제됩니다.</li>
<li>서비스는 이용자의 귀책사유로 인한 서비스 이용 장애에 대하여 책임을 지지 않습니다.</li>
<li>서비스에 게재된 독서 기록 및 콘텐츠의 정확성, 신뢰성에 대해서는 이용자 본인에게 책임이 있습니다.</li>
</ul>

<h2>제6조 (유료 서비스)</h2>
<p>서비스의 일부 기능은 유료로 제공될 수 있으며, 유료 서비스의 이용 요금 및 결제 방법은 해당 서비스 내에 별도로 안내됩니다. 구독 및 결제는 Apple App Store의 정책을 따릅니다.</p>

<h2>제7조 (기타)</h2>
<ul>
<li>본 약관에서 정하지 아니한 사항에 대해서는 관계 법령 및 상관례에 따릅니다.</li>
<li>본 약관은 대한민국 법률에 따라 해석되고 적용됩니다.</li>
<li>서비스 이용과 관련된 분쟁은 서비스의 본사 소재지를 관할하는 법원을 합의 관할로 합니다.</li>
</ul>
</body></html>
''';
    }
    return '''
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${_baseStyle(isDark)}</style></head>
<body>
<h1>Terms of Service</h1>
<p class="subtitle">Effective Date: January 1, 2026</p>

<h2>1. Purpose</h2>
<p>These Terms of Service govern your use of Bookgolas (the "Service"), a reading record and management application. By using the Service, you agree to be bound by these terms.</p>

<h2>2. Service Description</h2>
<p>The Service provides the following features:</p>
<ul>
<li>Reading record and progress tracking</li>
<li>Reading goal setting and achievement tracking</li>
<li>Highlights, memos, and photo records</li>
<li>AI-powered reading record search and analysis</li>
<li>Book review writing and management</li>
<li>Reading statistics and insights</li>
</ul>

<h2>3. User Obligations</h2>
<ul>
<li>Users must comply with applicable laws, these terms, and any guidelines published by the Service.</li>
<li>Users may not reproduce, distribute, broadcast, or commercially exploit information obtained through the Service without prior consent.</li>
<li>Users must not infringe upon the personal information of others or interfere with the normal operation of the Service.</li>
<li>Users are responsible for maintaining the security of their account credentials.</li>
</ul>

<h2>4. Service Modifications and Interruptions</h2>
<p>The Service may modify or discontinue all or part of its features for operational or technical reasons. Users will be notified in advance of any such changes.</p>

<h2>5. Disclaimer</h2>
<ul>
<li>The Service is not liable for interruptions caused by force majeure events such as natural disasters, wars, or telecommunications service outages.</li>
<li>The Service is not responsible for service disruptions caused by the user's own actions.</li>
<li>Users are responsible for the accuracy and reliability of their reading records and content.</li>
</ul>

<h2>6. Paid Services</h2>
<p>Some features may be offered as paid services. Pricing and payment methods are described within the Service. Subscriptions and payments are processed through the Apple App Store and are subject to its policies.</p>

<h2>7. General</h2>
<ul>
<li>Matters not specified in these terms are governed by applicable laws and customary practices.</li>
<li>These terms are interpreted and applied under the laws of the Republic of Korea.</li>
<li>Disputes related to the Service shall be resolved by the competent court in the jurisdiction of the Service's headquarters.</li>
</ul>
</body></html>
''';
  }

  static String privacyPolicy(String locale, bool isDark) {
    if (locale == 'ko') {
      return '''
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${_baseStyle(isDark)}</style></head>
<body>
<h1>개인정보처리방침</h1>
<p class="subtitle">시행일: 2026년 1월 1일</p>

<h2>제1조 (수집하는 개인정보)</h2>
<p>서비스는 다음과 같은 개인정보를 수집합니다:</p>
<ul>
<li><strong>필수 정보:</strong> 이메일 주소, 비밀번호(암호화 저장)</li>
<li><strong>선택 정보:</strong> 닉네임, 프로필 사진</li>
<li><strong>자동 수집:</strong> 서비스 이용 기록, 기기 정보(OS 버전, 기기 모델)</li>
<li><strong>소셜 로그인 시:</strong> 소셜 계정에서 제공하는 이메일, 이름, 프로필 사진</li>
</ul>

<h2>제2조 (이용 목적)</h2>
<p>수집된 개인정보는 다음과 같은 목적으로 이용됩니다:</p>
<ul>
<li>회원 가입 및 본인 확인</li>
<li>독서 기록 저장 및 동기화</li>
<li>AI 기반 독서 분석 및 추천 서비스 제공</li>
<li>알림 서비스 제공(독서 리마인더, 목표 알림 등)</li>
<li>서비스 개선 및 새로운 기능 개발</li>
<li>고객 지원 및 문의 응답</li>
</ul>

<h2>제3조 (보관 기간)</h2>
<ul>
<li>회원 탈퇴 시 개인정보는 즉시 파기됩니다.</li>
<li>단, 관계 법령에 의해 보존이 필요한 경우 해당 기간 동안 보관합니다.</li>
<li>전자상거래 등에서의 소비자보호에 관한 법률에 따라 계약 또는 청약 철회에 관한 기록은 5년간 보관합니다.</li>
</ul>

<h2>제4조 (제3자 제공)</h2>
<p>서비스는 이용자의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다:</p>
<ul>
<li>이용자가 사전에 동의한 경우</li>
<li>법령의 규정에 의거하거나 수사 목적으로 법정 절차에 따라 요청이 있는 경우</li>
</ul>
<p>서비스는 다음과 같은 외부 서비스를 이용합니다:</p>
<ul>
<li><strong>Supabase:</strong> 데이터 저장 및 인증 (AWS 클라우드)</li>
<li><strong>Firebase:</strong> 푸시 알림 서비스</li>
<li><strong>Apple App Store:</strong> 구독 결제 처리</li>
</ul>

<h2>제5조 (이용자의 권리)</h2>
<p>이용자는 다음과 같은 권리를 행사할 수 있습니다:</p>
<ul>
<li>개인정보 열람, 수정, 삭제 요청</li>
<li>개인정보 처리 정지 요청</li>
<li>계정 삭제를 통한 모든 개인정보 파기 요청</li>
<li>앱 내 마이페이지에서 프로필 정보 직접 수정 가능</li>
</ul>

<h2>제6조 (개인정보의 안전성 확보 조치)</h2>
<ul>
<li>비밀번호는 암호화되어 저장됩니다.</li>
<li>개인정보에 대한 접근 권한을 최소한으로 제한합니다.</li>
<li>SSL/TLS 암호화 통신을 사용합니다.</li>
</ul>

<h2>제7조 (문의)</h2>
<p>개인정보 처리에 관한 문의는 앱 내 설정 또는 이메일을 통해 접수할 수 있습니다.</p>
</body></html>
''';
    }
    return '''
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${_baseStyle(isDark)}</style></head>
<body>
<h1>Privacy Policy</h1>
<p class="subtitle">Effective Date: January 1, 2026</p>

<h2>1. Personal Information Collected</h2>
<p>The Service collects the following personal information:</p>
<ul>
<li><strong>Required:</strong> Email address, password (stored encrypted)</li>
<li><strong>Optional:</strong> Nickname, profile photo</li>
<li><strong>Automatically collected:</strong> Service usage logs, device information (OS version, device model)</li>
<li><strong>Social login:</strong> Email, name, and profile photo provided by the social account</li>
</ul>

<h2>2. Purpose of Use</h2>
<p>Collected personal information is used for the following purposes:</p>
<ul>
<li>Account registration and identity verification</li>
<li>Reading record storage and synchronization</li>
<li>AI-based reading analysis and recommendation services</li>
<li>Notification services (reading reminders, goal alerts, etc.)</li>
<li>Service improvement and new feature development</li>
<li>Customer support and inquiry response</li>
</ul>

<h2>3. Retention Period</h2>
<ul>
<li>Personal information is deleted immediately upon account deletion.</li>
<li>However, if retention is required by law, data is kept for the legally mandated period.</li>
<li>Records related to contracts or subscription cancellations are retained for 5 years in accordance with consumer protection laws.</li>
</ul>

<h2>4. Disclosure to Third Parties</h2>
<p>The Service does not, in principle, provide personal information to third parties. Exceptions include:</p>
<ul>
<li>When the user has given prior consent</li>
<li>When required by law or through legal procedures for investigative purposes</li>
</ul>
<p>The Service uses the following external services:</p>
<ul>
<li><strong>Supabase:</strong> Data storage and authentication (AWS Cloud)</li>
<li><strong>Firebase:</strong> Push notification service</li>
<li><strong>Apple App Store:</strong> Subscription payment processing</li>
</ul>

<h2>5. User Rights</h2>
<p>Users may exercise the following rights:</p>
<ul>
<li>Request to view, modify, or delete personal information</li>
<li>Request to suspend processing of personal information</li>
<li>Request deletion of all personal information by deleting their account</li>
<li>Directly modify profile information through the My Page section in the app</li>
</ul>

<h2>6. Security Measures</h2>
<ul>
<li>Passwords are stored in encrypted form.</li>
<li>Access to personal information is restricted to the minimum necessary.</li>
<li>SSL/TLS encrypted communication is used.</li>
</ul>

<h2>7. Contact</h2>
<p>Inquiries regarding personal information processing can be submitted through the app settings or via email.</p>
</body></html>
''';
  }

  static String announcements(String locale, bool isDark) {
    if (locale == 'ko') {
      return '''
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${_baseStyle(isDark)}</style></head>
<body>
<div class="empty">
<p>📢</p>
<p>현재 공지사항이 없습니다.</p>
</div>
</body></html>
''';
    }
    return '''
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${_baseStyle(isDark)}</style></head>
<body>
<div class="empty">
<p>📢</p>
<p>No announcements at this time.</p>
</div>
</body></html>
''';
  }
}
