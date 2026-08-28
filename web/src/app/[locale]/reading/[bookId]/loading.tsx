import { getTranslations } from "next-intl/server";

export default async function ReadingLoading() {
  const t = await getTranslations("consumer");

  return (
    <main className="mesh-gradient min-h-screen px-4 py-12 sm:px-6" aria-busy="true">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-white/60">{t("states.loading")}</p>
        <div className="mt-8 h-96 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
      </div>
    </main>
  );
}
