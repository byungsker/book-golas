import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <main className="flex flex-col items-center text-center max-w-2xl">
        <Image
          src="/logo-bookgolas.png"
          alt="Bookgolas Logo"
          width={120}
          height={120}
          className="mb-8"
          priority
        />

        <h1 className="text-4xl font-bold text-foreground mb-4">
          북골라스
        </h1>

        <p className="text-xl text-muted-foreground mb-2">
          Bookgolas
        </p>

        <p className="text-lg text-muted-foreground mb-8 max-w-md">
          독서 목표 달성을 위한 스마트한 동반자
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 w-full max-w-lg">
          <div className="flex flex-col items-center p-4 rounded-lg bg-card border border-border">
            <span className="text-3xl mb-2">📚</span>
            <span className="text-sm text-muted-foreground">독서 목표 설정</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-lg bg-card border border-border">
            <span className="text-3xl mb-2">📈</span>
            <span className="text-sm text-muted-foreground">진행률 추적</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-lg bg-card border border-border">
            <span className="text-3xl mb-2">🔔</span>
            <span className="text-sm text-muted-foreground">스마트 알림</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="https://apps.apple.com/app/bookgolas"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            App Store
          </Link>
          <span className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-border text-muted-foreground cursor-not-allowed">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
            </svg>
            Coming Soon
          </span>
        </div>

        <p className="mt-12 text-sm text-muted-foreground">
          © 2024 Bookgolas. All rights reserved.
        </p>
      </main>
    </div>
  );
}
