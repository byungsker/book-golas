export function csvEscape(value: string): string {
  const neutralized = /^[\u0000-\u0020]*[=+\-@]/.test(value)
    ? `'${value}`
    : value;
  if (/[",\n]/.test(neutralized)) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }
  return neutralized;
}
