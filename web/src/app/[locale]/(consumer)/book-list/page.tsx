import { ConsumerRoutePlaceholder } from "@/components/consumer/consumer-route-placeholder";
import type { ConsumerLocale } from "@/lib/consumer/paths";

export default async function BookListPage({ params }: { params: Promise<{ locale: ConsumerLocale }> }) {
  const { locale } = await params;
  return <ConsumerRoutePlaceholder locale={locale} titleKey="bookList" />;
}
