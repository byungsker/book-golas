const adminEmails = new Set([
  "admin@bookgolas.com",
  "byungsker@naver.com",
  "extreme0728@gmail.com",
]);

export function isAdminEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && adminEmails.has(email.toLowerCase());
}
