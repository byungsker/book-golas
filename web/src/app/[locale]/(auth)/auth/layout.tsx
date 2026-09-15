export default function ConsumerAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mesh-gradient flex min-h-[calc(100vh-1px)] items-center justify-center px-4 py-12 sm:px-6">
      {children}
    </main>
  );
}
