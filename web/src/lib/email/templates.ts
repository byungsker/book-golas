type Locale = "ko" | "en";

type Template = {
  subject: string;
  html: string;
  text: string;
};

const SITE_URL = "https://book-golas.vercel.app";

export function waitlistWelcomeTemplate(locale: Locale): Template {
  return locale === "en" ? enTemplate() : koTemplate();
}

function koTemplate(): Template {
  return {
    subject: "북골라스 출시 알림 신청 완료 🎉",
    text: [
      "북골라스 출시 알림 신청이 완료되었습니다.",
      "",
      "iOS 앱이 App Store에 출시되는 즉시 이메일로 알려드릴게요.",
      "조금만 기다려주세요!",
      "",
      `웹 미리보기: ${SITE_URL}`,
      "",
      "— byungsker (Bookgolas)",
    ].join("\n"),
    html: layout(
      "신청 완료 🎉",
      `
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f2937;">
          북골라스 <strong>출시 알림 신청</strong>이 완료되었습니다.
        </p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#4b5563;">
          iOS 앱이 App Store에 출시되는 즉시 이 이메일로 가장 먼저 알려드릴게요.
          조금만 기다려주세요!
        </p>
        <div style="margin:24px 0;text-align:center;">
          <a href="${SITE_URL}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#5B7FFF,#6B8AFF);color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">
            웹사이트 둘러보기 →
          </a>
        </div>
        <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
          이 이메일에 답장하시면 직접 받아볼게요.<br/>
          출시 알림 외 다른 용도로는 사용되지 않습니다.
        </p>
      `,
    ),
  };
}

function enTemplate(): Template {
  return {
    subject: "You're on the Bookgolas waitlist 🎉",
    text: [
      "You're on the Bookgolas launch waitlist.",
      "",
      "We'll email you the moment Bookgolas hits the App Store.",
      "Stay tuned!",
      "",
      `Web preview: ${SITE_URL}`,
      "",
      "— byungsker (Bookgolas)",
    ].join("\n"),
    html: layout(
      "You're on the list 🎉",
      `
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f2937;">
          You're confirmed on the <strong>Bookgolas launch waitlist</strong>.
        </p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#4b5563;">
          We'll email you the moment Bookgolas hits the App Store. Stay tuned!
        </p>
        <div style="margin:24px 0;text-align:center;">
          <a href="${SITE_URL}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#5B7FFF,#6B8AFF);color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">
            Visit the site →
          </a>
        </div>
        <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
          Reply to this email to reach me directly.<br/>
          We'll only use your email for the launch announcement.
        </p>
      `,
    ),
  };
}

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
            <tr>
              <td style="padding:32px 32px 0;">
                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:18px;font-weight:700;color:#5B7FFF;margin-bottom:8px;">
                  Bookgolas
                </div>
                <h1 style="margin:0 0 24px;font-size:22px;line-height:1.3;color:#111827;font-weight:700;">
                  ${title}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px;border-top:1px solid #f3f4f6;">
                <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                  © 2026 Bookgolas · Made by <a href="https://github.com/byungsker" style="color:#6B8AFF;text-decoration:none;">byungsker</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
