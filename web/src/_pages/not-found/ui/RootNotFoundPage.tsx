import Image from "next/image";
import Link from "next/link";

export default function RootNotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <main className="flex flex-col items-center text-center">
        <Image
          src="/logo-bookgolas.png"
          alt="Bookgolas Logo"
          width={80}
          height={80}
          className="mb-6 opacity-50"
        />

        <h1 className="mb-4 text-6xl font-bold text-foreground">404</h1>

        <h2 className="mb-2 text-xl font-medium text-muted-foreground">
          페이지를 찾을 수 없습니다
        </h2>

        <p className="mb-8 max-w-md text-muted-foreground">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 font-medium text-background transition-opacity hover:opacity-90"
        >
          홈으로 돌아가기
        </Link>
      </main>
    </div>
  );
}
