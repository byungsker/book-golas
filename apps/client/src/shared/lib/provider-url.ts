export const trustedBookImageHosts = [
  "books.google.com",
  "books.googleusercontent.com",
  "image.aladin.co.kr",
] as const;

export const trustedBookLinkHosts = [
  "aladin.co.kr",
  "www.aladin.co.kr",
  "books.google.com",
] as const;

export function sanitizeTrustedProviderUrl(
  value: string | null | undefined,
  hosts: readonly string[],
): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !hosts.includes(hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}
