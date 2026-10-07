export function isEventNudgeWindow(
  kstHour: number,
  kstMinute: number,
): boolean {
  return kstHour === 18 && kstMinute === 0;
}

export function buildEventNudgeDedupeKey({
  kstDate,
  userId,
  tokenHash,
}: {
  kstDate: string;
  userId: string;
  tokenHash: string;
}): string {
  return `event:${kstDate}:${userId}:${tokenHash}`;
}
