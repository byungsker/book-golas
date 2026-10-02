export function isPrivateBookImagePath(path: string, userId: string, bookId: string): boolean {
  const prefix = `${userId}/${bookId}/`;
  const fileName = path.startsWith(prefix) ? path.slice(prefix.length) : "";
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(fileName) && !fileName.includes("..");
}
