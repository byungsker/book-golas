import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
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

        <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>

        <h2 className="text-xl font-medium text-muted-foreground mb-2">
          페이지를 찾을 수 없습니다
        </h2>

        <p className="text-muted-foreground mb-8 max-w-md">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
        >
          홈으로 돌아가기
        </Link>
      </main>
    </div>
  );
}
