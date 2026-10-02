import { BookIdSchema, LocaleSchema, type Locale } from "./common";

const bookIdSegment = (bookId: string) => BookIdSchema.parse(bookId);
const localeSegment = (locale: string) => LocaleSchema.parse(locale);

export const consumerRoutes = {
  login: (locale: Locale) => `/${localeSegment(locale)}/auth/sign-in`,
  signup: (locale: Locale) => `/${localeSegment(locale)}/auth/sign-up`,
  forgotPassword: (locale: Locale) => `/${localeSegment(locale)}/auth/reset-password`,
  app: (locale: Locale) => `/${localeSegment(locale)}/home`,
  terms: (locale: Locale) => `/${localeSegment(locale)}/terms`,
  announcements: (locale: Locale) => `/${localeSegment(locale)}/announcements`,
  onboarding: (locale: Locale) => `/${localeSegment(locale)}/onboarding`,
  library: (locale: Locale) => `/${localeSegment(locale)}/library`,
  stats: (locale: Locale) => `/${localeSegment(locale)}/stats`,
  readingInsights: (locale: Locale) => `/${localeSegment(locale)}/reading-insights`,
  calendar: (locale: Locale) => `/${localeSegment(locale)}/calendar`,
  account: (locale: Locale) => `/${localeSegment(locale)}/account`,
  accountDeleted: (locale: Locale) => `/${localeSegment(locale)}/account-deleted`,
  bookList: (locale: Locale) => `/${localeSegment(locale)}/book-list`,
  newBook: (locale: Locale) => `/${localeSegment(locale)}/books/new`,
  book: (locale: Locale, bookId: string) => `/${localeSegment(locale)}/books/${bookIdSegment(bookId)}`,
  reading: (locale: Locale, bookId: string) => `/${localeSegment(locale)}/reading/${bookIdSegment(bookId)}`,
  recall: (locale: Locale) => `/${localeSegment(locale)}/library?mode=recall`,
  review: (locale: Locale, bookId: string) => `/${localeSegment(locale)}/books/${bookIdSegment(bookId)}/review`,
  mindMap: (locale: Locale, bookId: string) => `/${localeSegment(locale)}/books/${bookIdSegment(bookId)}/mind-map`,
  scan: (locale: Locale) => `/${localeSegment(locale)}/books/scan`,
  subscription: (locale: Locale) => `/${localeSegment(locale)}/subscription`,
  privacy: (locale: Locale) => `/${localeSegment(locale)}/privacy`,
  authCallback: "/auth/callback",
  authResetPassword: "/auth/reset-password",
} as const;
