import { OwnedBookRoutePlaceholder } from "@/components/consumer/consumer-route-placeholder";
import type { ConsumerLocale } from "@/lib/consumer/paths";

export default async function BookMindMapPage({ params }: { params: Promise<{ locale: ConsumerLocale; bookId: string }> }) {
  const { locale, bookId } = await params;
  return <OwnedBookRoutePlaceholder locale={locale} bookId={bookId} titleKey="mindMap" />;
}
