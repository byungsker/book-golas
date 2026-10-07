export function normalizeIsbn13(value: string): string {
  return value.replace(/[\s-]/g, "");
}

export function isValidIsbn13(value: string): boolean {
  const isbn = normalizeIsbn13(value);
  if (!/^(?:978|979)\d{10}$/.test(isbn)) return false;

  const sum = isbn
    .slice(0, 12)
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  const checkDigit = (10 - (sum % 10)) % 10;
  return Number(isbn[12]) === checkDigit;
}
