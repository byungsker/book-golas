const ADMIN_EMAILS = new Set([
  "admin@bookgolas.com",
  "byungsker@naver.com",
  "extreme0728@gmail.com",
]);

export function isAdminEmail(email: string | undefined): boolean {
  return email !== undefined && ADMIN_EMAILS.has(email.toLowerCase());
}
