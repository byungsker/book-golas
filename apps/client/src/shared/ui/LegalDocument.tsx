import Link from "next/link";
import type { LegalLocale } from "@/shared/config";

export function LegalDocument({
  locale,
  title,
  lastUpdated,
  backHome,
  children,
  copyright,
}: {
  locale: LegalLocale;
  title: string;
  lastUpdated: string;
  backHome: string;
  children: React.ReactNode;
  copyright: string;
}) {
  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href={"/" + locale}
          className="text-sm text-white/60 underline-offset-4 hover:text-white hover:underline"
        >
          {backHome}
        </Link>
        <h1 className="mb-8 mt-6 text-center text-3xl font-bold text-white">
          {title}
        </h1>
        <div className="prose prose-lg mx-auto">
          <p className="mb-4 text-gray-400">
            <strong className="text-gray-300">{lastUpdated}</strong>
          </p>
          {children}
        </div>
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>{copyright}</p>
        </div>
      </div>
    </main>
  );
}
