export default function ConsumerAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="bookgolas-consumer-page flex min-h-[100dvh] items-center justify-center bg-[var(--blab-surface-scaffold)] px-[var(--blab-space-lg)] py-[var(--blab-space-xxl)] text-[var(--blab-text-primary)] sm:px-[var(--blab-space-xxl)]">
      {children}
    </main>
  );
}
