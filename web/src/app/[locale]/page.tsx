"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";

function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true);
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { ref, visible };
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
    </span>
  );
}

function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <div
      className="flex items-center gap-1 text-xs"
      style={{ color: "rgba(255,255,255,0.45)" }}
    >
      <button
        onClick={() => switchLocale("ko")}
        className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${locale === "ko" ? "text-white bg-white/10" : "hover:text-white/70"}`}
        disabled={isPending}
      >
        KO
      </button>
      <span>/</span>
      <button
        onClick={() => switchLocale("en")}
        className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${locale === "en" ? "text-white bg-white/10" : "hover:text-white/70"}`}
        disabled={isPending}
      >
        EN
      </button>
    </div>
  );
}

function ProgressBar({ percent, color = "#5B7FFF" }: { percent: number; color?: string }) {
  return (
    <div
      className="relative w-full rounded-full overflow-hidden"
      style={{ height: 4, background: "rgba(255,255,255,0.08)" }}
    >
      <div
        style={{
          width: `${percent}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          borderRadius: 2,
          transition: "width 0.8s ease",
        }}
      />
    </div>
  );
}

function PhoneMockup() {
  const t = useTranslations("mockup");
  const [count, setCount] = useState(2);
  const [typed, setTyped] = useState("");
  const [typing, setTyping] = useState(false);

  const books = [
    {
      id: 1,
      title: t("book1Title"),
      author: t("book1Author"),
      progress: parseInt(t("book1Progress")),
      total: parseInt(t("book1Total")),
      percent: 70,
      color: "#5B7FFF",
      coverColor: "rgba(91,127,255,0.1)",
      dday: 14,
      active: true,
    },
    {
      id: 2,
      title: t("book2Title"),
      author: t("book2Author"),
      progress: parseInt(t("book2Progress")),
      total: parseInt(t("book2Total")),
      percent: 30,
      color: "#10B981",
      coverColor: "rgba(16,185,129,0.1)",
      dday: 30,
      active: false,
    },
    {
      id: 3,
      title: t("book3Title"),
      author: t("book3Author"),
      progress: 0,
      total: parseInt(t("book3Total")),
      percent: 0,
      color: "#F59E0B",
      coverColor: "rgba(245,158,11,0.1)",
      dday: 45,
      active: false,
    },
  ];

  const typingText = t("typingBook");

  useEffect(() => {
    let i = 0;
    const start = setInterval(() => {
      if (i <= typingText.length) {
        setTyped(typingText.slice(0, i));
        setTyping(true);
        i++;
      } else {
        clearInterval(start);
        setTimeout(() => {
          setCount((c) => Math.min(c + 1, books.length));
          setTyped("");
          setTyping(false);
          setTimeout(() => setCount(2), 4800);
        }, 600);
      }
    }, 80);
    return () => clearInterval(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  return (
    <div className="relative flex items-center justify-center select-none">
      <div
        className="absolute inset-0 rounded-[40px] pointer-events-none animate-pulse"
        style={{
          background: "rgba(91,127,255,0.14)",
          filter: "blur(32px)",
          zIndex: 0,
        }}
      />
      <div
        className="relative z-10 overflow-hidden phone-glow"
        style={{
          width: 268,
          height: 558,
          borderRadius: 44,
          background: "linear-gradient(180deg,#181a2c 0%,#111320 100%)",
          border: "1.5px solid rgba(255,255,255,0.1)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.07), 0 40px 80px rgba(0,0,0,0.6)",
        }}
      >
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-30"
          style={{
            width: 88,
            height: 24,
            background: "#000",
            borderRadius: 12,
          }}
        />

        <div className="absolute inset-0 flex flex-col pt-14 pb-6 px-4">
          <div
            className="flex justify-between items-center mb-4 px-1"
            style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}
          >
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <LiveDot />
              <span style={{ fontSize: 9, color: "#34d399" }}>
                {t("realtime")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 mb-1">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center text-sm"
              style={{
                background: "rgba(91,127,255,0.18)",
                border: "1px solid rgba(91,127,255,0.25)",
              }}
            >
              📚
            </div>
            <div>
              <div
                className="text-white font-semibold text-sm"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("headerTitle")}
              </div>
              <div
                style={{ fontSize: 10, color: "rgba(255,255,255,0.38)" }}
              >
                {t("todayGoal")}
              </div>
            </div>
          </div>

          <div
            className="mb-3 ml-0.5 flex items-center gap-1"
            style={{ fontSize: 10, color: "rgba(245,158,11,0.75)" }}
          >
            <span>🔥</span>
            <span>7{t("streakLabel")}</span>
          </div>

          <div className="flex flex-col gap-2 flex-1 overflow-hidden">
            {books.slice(0, count).map((book, i) => (
              <div
                key={book.id}
                className="rounded-xl px-3 py-2.5"
                style={{
                  background: book.active
                    ? "rgba(91,127,255,0.07)"
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${book.active ? "rgba(91,127,255,0.2)" : "rgba(255,255,255,0.07)"}`,
                  animation:
                    i >= 2 ? "book-item 0.4s ease-out both" : "none",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: book.coverColor, border: `1px solid ${book.color}20` }}
                  >
                    <span style={{ fontSize: 16 }}>📖</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-medium truncate"
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.9)",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {book.title}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="px-1.5 py-px rounded-full font-medium"
                        style={{
                          fontSize: 7.5,
                          background: `${book.color}20`,
                          color: book.color,
                          border: `1px solid ${book.color}30`,
                        }}
                      >
                        D-{book.dday}
                      </span>
                      <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.35)" }}>
                        {book.progress}/{book.total} {t("pagesRead")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="flex-1">
                        <ProgressBar percent={book.percent} color={book.color} />
                      </div>
                      <span style={{ fontSize: 8, color: "rgba(255,255,255,0.45)" }}>
                        {book.percent}%
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            ))}

            {typing && (
              <div
                className="rounded-xl px-3 py-2.5"
                style={{
                  background: "rgba(91,127,255,0.05)",
                  border: "1px solid rgba(91,127,255,0.22)",
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{
                      border: "1.5px solid rgba(91,127,255,0.35)",
                    }}
                  />
                  <span
                    className="flex-1 text-xs"
                    style={{ color: "rgba(255,255,255,0.65)" }}
                  >
                    {typed}
                    <span className="animate-pulse">|</span>
                  </span>
                </div>
                <div style={{ fontSize: 8.5, color: "rgba(107,138,255,0.6)" }}>
                  {t("typingBy")}
                </div>
              </div>
            )}
          </div>

          <div
            className="mt-3 rounded-xl flex items-center justify-center gap-1.5 py-2.5"
            style={{
              background: "rgba(91,127,255,0.12)",
              border: "1px solid rgba(91,127,255,0.22)",
            }}
          >
            <span
              className="text-lg leading-none"
              style={{ color: "#6B8AFF" }}
            >
              +
            </span>
            <span
              className="text-xs font-medium"
              style={{ color: "#6B8AFF" }}
            >
              {t("addSession")}
            </span>
          </div>
        </div>

        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2"
          style={{
            width: 96,
            height: 4,
            borderRadius: 2,
            background: "rgba(255,255,255,0.18)",
          }}
        />
      </div>
    </div>
  );
}

function ReadingListPhone() {
  const books = [
    { title: "클린 코드", author: "로버트 C. 마틴", percent: 70, color: "#5B7FFF", coverColor: "rgba(91,127,255,0.1)", pages: "234/334", dday: 14 },
    { title: "사피엔스", author: "유발 하라리", percent: 30, color: "#10B981", coverColor: "rgba(16,185,129,0.1)", pages: "132/443", dday: 30 },
    { title: "원씽", author: "게리 켈러", percent: 0, color: "#F59E0B", coverColor: "rgba(245,158,11,0.1)", pages: "0/256", dday: 45 },
    { title: "어린 왕자", author: "생텍쥐페리", percent: 100, color: "#34d399", coverColor: "rgba(52,211,153,0.1)", pages: "96/96", dday: 0 },
  ];
  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: 240,
        height: 500,
        borderRadius: 40,
        background: "linear-gradient(180deg,#181a2c 0%,#111320 100%)",
        border: "1.5px solid rgba(255,255,255,0.1)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.07),0 32px 64px rgba(0,0,0,0.55)",
        flexShrink: 0,
      }}
    >
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 z-30"
        style={{ width: 80, height: 22, background: "#000", borderRadius: 11 }}
      />
      <div className="absolute inset-0 flex flex-col pt-12 pb-5 px-3.5">
        <div
          className="flex justify-between items-center mb-3 px-1"
          style={{ fontSize: 9, color: "rgba(255,255,255,0.38)" }}
        >
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <LiveDot />
            <span style={{ fontSize: 8, color: "#34d399" }}>진행 중</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
            style={{ background: "rgba(91,127,255,0.18)", border: "1px solid rgba(91,127,255,0.25)" }}
          >
            📚
          </div>
          <div className="text-white font-semibold" style={{ fontSize: 12, fontFamily: "var(--font-display)" }}>
            나의 독서 목표
          </div>
        </div>
        <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
          {books.map((book, i) => (
            <div
              key={i}
              className="rounded-xl px-2.5 py-2"
              style={{
                background: book.percent === 100 ? "rgba(16,185,129,0.07)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${book.percent === 100 ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.07)"}`,
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-11 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: book.coverColor, border: `1px solid ${book.color}20` }}
                >
                  <span style={{ fontSize: 12 }}>📖</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-medium truncate"
                    style={{ fontSize: 9.5, color: "rgba(255,255,255,0.88)", fontFamily: "var(--font-display)" }}
                  >
                    {book.title}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {book.dday > 0 ? (
                      <span
                        className="px-1 py-px rounded-full"
                        style={{ fontSize: 6.5, background: `${book.color}20`, color: book.color, border: `1px solid ${book.color}30` }}
                      >
                        D-{book.dday}
                      </span>
                    ) : (
                      <span
                        className="px-1 py-px rounded-full"
                        style={{ fontSize: 6.5, background: "rgba(52,211,153,0.2)", color: "#34d399" }}
                      >
                        완독
                      </span>
                    )}
                    <span style={{ fontSize: 7.5, color: "rgba(255,255,255,0.3)" }}>
                      {book.pages} 페이지
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex-1">
                      <ProgressBar percent={book.percent} color={book.color} />
                    </div>
                    <span style={{ fontSize: 7, color: "rgba(255,255,255,0.4)" }}>{book.percent}%</span>
                  </div>
                </div>
                <div className="flex-shrink-0" style={{ color: "rgba(255,255,255,0.15)" }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2"
        style={{ width: 80, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.18)" }}
      />
    </div>
  );
}

function ReadingLogPhone() {
  const calendarDays = [
    0, 0, 0, 0, 0, 1, 2,
    3, 1, 2, 0, 3, 2, 1,
    2, 3, 1, 0, 2, 1, 3,
    2, 1, 0, 3, 2, 1, 2,
  ];
  const dayHeaders = ["월", "화", "수", "목", "금", "토", "일"];
  const filterTabs = ["전체", "독서", "메모", "리뷰"];

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: 268,
        height: 558,
        borderRadius: 44,
        background: "linear-gradient(180deg,#181a2c 0%,#111320 100%)",
        border: "1.5px solid rgba(255,255,255,0.1)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.07),0 40px 80px rgba(0,0,0,0.6)",
        flexShrink: 0,
      }}
    >
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 z-30"
        style={{ width: 88, height: 24, background: "#000", borderRadius: 12 }}
      />
      <div className="absolute inset-0 flex flex-col pt-14 pb-6 px-4">
        <div
          className="flex justify-between items-center mb-4 px-1"
          style={{ fontSize: 10, color: "rgba(255,255,255,0.38)" }}
        >
          <span>9:41</span>
          <span>독서 기록</span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.4 }}>
            <path d="M9 3L5 7l4 4" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="text-white font-bold" style={{ fontSize: 15, fontFamily: "var(--font-display)" }}>
            2월
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.4 }}>
            <path d="M5 3l4 4-4 4" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div className="flex gap-1.5 mb-3">
          {filterTabs.map((tab, i) => (
            <div
              key={i}
              className="flex-1 text-center py-1 rounded-lg"
              style={{
                fontSize: 8.5,
                fontWeight: i === 0 ? 600 : 400,
                color: i === 0 ? "white" : "rgba(255,255,255,0.35)",
                background: i === 0 ? "rgba(91,127,255,0.2)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${i === 0 ? "rgba(91,127,255,0.3)" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              {tab}
            </div>
          ))}
        </div>

        <div
          className="rounded-xl p-2.5 mb-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="grid grid-cols-7 gap-1 mb-1.5">
            {dayHeaders.map((d, i) => (
              <div key={i} className="text-center" style={{ fontSize: 7, color: "rgba(255,255,255,0.3)" }}>
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((level, i) => (
              <div
                key={i}
                className="aspect-square rounded-md flex items-center justify-center"
                style={{
                  background: level === 0
                    ? "rgba(255,255,255,0.03)"
                    : level === 1
                      ? "rgba(91,127,255,0.15)"
                      : level === 2
                        ? "rgba(91,127,255,0.3)"
                        : "rgba(91,127,255,0.5)",
                }}
              >
                <span style={{ fontSize: 7, color: level > 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)" }}>
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-2.5">
          <div className="font-semibold text-white mb-2" style={{ fontSize: 11, fontFamily: "var(--font-display)" }}>
            오늘 독서
          </div>
          <div
            className="rounded-xl px-3 py-2.5"
            style={{ background: "rgba(91,127,255,0.07)", border: "1px solid rgba(91,127,255,0.18)" }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-11 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(91,127,255,0.1)", border: "1px solid rgba(91,127,255,0.2)" }}
              >
                <span style={{ fontSize: 12 }}>📖</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-white font-medium truncate" style={{ fontSize: 10, fontFamily: "var(--font-display)" }}>
                    클린 코드
                  </span>
                  <span style={{ fontSize: 8, color: "#6B8AFF" }}>+15p</span>
                </div>
                <ProgressBar percent={70} color="#5B7FFF" />
                <div className="mt-0.5 flex justify-between" style={{ fontSize: 7.5, color: "rgba(255,255,255,0.3)" }}>
                  <span>234 / 334</span>
                  <span>완독까지 100p</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-2.5"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}
        >
          <div style={{ fontSize: 9, color: "rgba(245,158,11,0.8)", lineHeight: 1.5 }}>
            오늘 목표까지 12분 더 읽으면 달성! 화이팅 🎯
          </div>
        </div>
      </div>
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2"
        style={{ width: 96, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.18)" }}
      />
    </div>
  );
}

function StatsPhone() {
  const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
  const counts = [2, 3, 1, 4, 2, 3];
  const maxCount = Math.max(...counts);
  const tabs = ["개요", "분석", "활동"];

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: 240,
        height: 500,
        borderRadius: 40,
        background: "linear-gradient(180deg,#181a2c 0%,#111320 100%)",
        border: "1.5px solid rgba(255,255,255,0.1)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.07),0 32px 64px rgba(0,0,0,0.55)",
        flexShrink: 0,
      }}
    >
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 z-30"
        style={{ width: 80, height: 22, background: "#000", borderRadius: 11 }}
      />
      <div className="absolute inset-0 flex flex-col pt-12 pb-5 px-3.5">
        <div
          className="flex justify-between items-center mb-3 px-1"
          style={{ fontSize: 9, color: "rgba(255,255,255,0.38)" }}
        >
          <span>9:41</span>
          <span>통계</span>
        </div>

        <div className="flex gap-1 mb-3">
          {tabs.map((tab, i) => (
            <div
              key={i}
              className="flex-1 text-center py-1.5 rounded-lg"
              style={{
                fontSize: 9,
                fontWeight: i === 0 ? 600 : 400,
                color: i === 0 ? "white" : "rgba(255,255,255,0.35)",
                background: i === 0 ? "rgba(91,127,255,0.2)" : "transparent",
                border: i === 0 ? "1px solid rgba(91,127,255,0.3)" : "1px solid transparent",
              }}
            >
              {tab}
            </div>
          ))}
        </div>

        <div
          className="rounded-xl p-2.5 mb-3"
          style={{ background: "rgba(91,127,255,0.07)", border: "1px solid rgba(91,127,255,0.15)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-white font-semibold" style={{ fontSize: 10, fontFamily: "var(--font-display)" }}>
                2026년 목표
              </div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)" }}>
                24권 중 3권 완독
              </div>
            </div>
            <div
              className="font-bold"
              style={{ fontSize: 16, color: "#5B7FFF", fontFamily: "var(--font-display)" }}
            >
              12.5%
            </div>
          </div>
          <div className="relative w-full rounded-full overflow-hidden" style={{ height: 6, background: "rgba(255,255,255,0.08)" }}>
            <div style={{ width: "12.5%", height: "100%", background: "linear-gradient(90deg, #5B7FFF, #6B8AFF)", borderRadius: 3 }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {[
            { icon: "📚", label: "총 페이지", value: "1,234p", color: "#5B7FFF" },
            { icon: "📅", label: "일평균 페이지", value: "45.2p", color: "#10B981" },
            { icon: "🔥", label: "연속 독서", value: "7일", color: "#F59E0B" },
            { icon: "🏁", label: "완독률", value: "67%", color: "#FF6B6B" },
          ].map((stat, i) => (
            <div
              key={i}
              className="rounded-xl p-2"
              style={{
                background: `${stat.color}09`,
                border: `1px solid ${stat.color}20`,
              }}
            >
              <div className="flex items-center gap-1 mb-1">
                <span style={{ fontSize: 10 }}>{stat.icon}</span>
                <span style={{ fontSize: 7.5, color: "rgba(255,255,255,0.35)" }}>{stat.label}</span>
              </div>
              <div className="font-bold" style={{ fontSize: 14, color: stat.color, fontFamily: "var(--font-display)" }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        <div
          className="rounded-xl p-2.5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="text-white font-semibold mb-2" style={{ fontSize: 9, fontFamily: "var(--font-display)" }}>
            월별 완독
          </div>
          <div className="flex items-end gap-1.5 h-16">
            {counts.map((count, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: `${(count / maxCount) * 48}px`,
                    background: i === counts.length - 1
                      ? "linear-gradient(180deg, #6B8AFF, #5B7FFF)"
                      : "rgba(91,127,255,0.25)",
                    minHeight: 4,
                  }}
                />
                <span style={{ fontSize: 6.5, color: "rgba(255,255,255,0.3)" }}>{months[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2"
        style={{ width: 80, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.18)" }}
      />
    </div>
  );
}

type FeatureCardProps = {
  icon: string;
  title: string;
  desc: string;
  accent: string;
  visible: boolean;
  delay?: number;
};

function FeatureCard({ icon, title, desc, accent, visible, delay = 0 }: FeatureCardProps) {
  return (
    <div
      className="glass feature-card rounded-2xl p-6"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity .5s ease ${delay}ms, transform .5s ease ${delay}ms`,
      }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4"
        style={{
          background: `${accent}18`,
          border: `1px solid ${accent}2e`,
        }}
      >
        {icon}
      </div>
      <h3
        className="font-semibold text-white mb-2 text-[15px]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h3>
      <p
        className="text-sm leading-relaxed"
        style={{ color: "rgba(255,255,255,0.52)" }}
      >
        {desc}
      </p>
    </div>
  );
}

function Step({
  num,
  title,
  desc,
  visible,
  delay,
}: {
  num: number;
  title: string;
  desc: string;
  visible: boolean;
  delay: number;
}) {
  return (
    <div
      className="flex gap-4"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-18px)",
        transition: `opacity .5s ease ${delay}ms, transform .5s ease ${delay}ms`,
      }}
    >
      <div
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white"
        style={{
          background: "linear-gradient(135deg,#5B7FFF,#6B8AFF)",
          boxShadow: "0 0 16px rgba(91,127,255,0.4)",
          fontFamily: "var(--font-display)",
        }}
      >
        {num}
      </div>
      <div className="pt-1">
        <div
          className="font-semibold text-white mb-1 text-[15px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </div>
        <div
          className="text-sm"
          style={{ color: "rgba(255,255,255,0.48)" }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
}

function GooglePlayDisabled({ label }: { label: string }) {
  return (
    <div className="relative">
      <div
        className="flex items-center gap-3 px-5 py-3 rounded-2xl opacity-50 cursor-not-allowed select-none"
        style={{
          background: "rgba(28,31,50,0.85)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path
            d="M3 20.5v-17c0-.83.95-1.3 1.6-.8l14 8.5c.6.37.6 1.23 0 1.6l-14 8.5c-.65.5-1.6.03-1.6-.8z"
            fill="url(#gp2)"
          />
          <defs>
            <linearGradient id="gp2" x1="3" y1="3" x2="21" y2="21">
              <stop stopColor="#10B981" />
              <stop offset="1" stopColor="#5B7FFF" />
            </linearGradient>
          </defs>
        </svg>
        <div className="text-left">
          <div className="text-white/45 text-[9px]">Get it on</div>
          <div
            className="text-white font-semibold text-sm"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Google Play
          </div>
        </div>
      </div>
      <span
        className="absolute -top-2 -right-2 text-[9px] font-bold px-2 py-0.5 rounded-full"
        style={{
          background: "rgba(255,150,50,0.9)",
          color: "white",
          fontFamily: "var(--font-display)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

export default function Page() {
  const locale = useLocale();
  const t = useTranslations();
  const feat = useReveal();
  const detail = useReveal();
  const steps = useReveal();
  const cta = useReveal();
  const shots = useReveal();
  const [hero, setHero] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHero(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const trans = (delay = 0) => ({
    opacity: hero ? 1 : 0,
    transform: hero ? "translateY(0)" : "translateY(22px)",
    transition: `opacity .6s ease ${delay}ms, transform .6s ease ${delay}ms`,
  });

  const localePath = (path: string) =>
    locale === "en" ? `/en${path}` : path;

  return (
    <div className="mesh-gradient min-h-screen">
      <nav
        className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 md:px-12 py-4"
        style={{
          background: "rgba(13,15,26,0.8)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(91,127,255,0.08)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt={t("nav.appName")}
            width={32}
            height={32}
            className="rounded-xl"
          />
          <span
            className="font-bold text-white text-lg"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("nav.appName")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <a
            href="#download"
            className="hidden sm:flex items-center gap-2 px-5 py-2 rounded-full font-medium text-sm text-white btn-primary"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("nav.download")}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 7h8M7 3l4 4-4 4"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 px-6 md:px-12 overflow-hidden">
        <div
          className="absolute top-20 left-1/4 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle,rgba(91,127,255,0.11) 0%,transparent 70%)",
            filter: "blur(48px)",
          }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle,rgba(245,158,11,0.07) 0%,transparent 70%)",
            filter: "blur(48px)",
          }}
        />

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 text-center md:text-left">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm mb-6"
              style={{
                ...trans(),
                background: "rgba(91,127,255,0.1)",
                border: "1px solid rgba(91,127,255,0.22)",
                color: "#6B8AFF",
              }}
            >
              <LiveDot />
              {t("hero.badge")}
            </div>

            <h1
              className="font-bold leading-[1.1] mb-5"
              style={{
                ...trans(80),
                fontFamily: "var(--font-display)",
                fontSize: "clamp(34px,5vw,56px)",
              }}
            >
              <span className="text-gradient">{t("hero.headline1")}</span>
              <br />
              <span className="text-white">{t("hero.headline2")}</span>
            </h1>

            <p
              className="text-base md:text-lg mb-8 max-w-md mx-auto md:mx-0 leading-relaxed"
              style={{ ...trans(160), color: "rgba(255,255,255,0.52)" }}
            >
              {t("hero.sub")}
            </p>

            <div
              className="flex gap-6 mb-8 justify-center md:justify-start"
              style={trans(240)}
            >
              {[
                { v: t("hero.stat1Value"), l: t("hero.stat1Label") },
                { v: t("hero.stat2Value"), l: t("hero.stat2Label") },
                { v: t("hero.stat3Value"), l: t("hero.stat3Label") },
              ].map((s) => (
                <div key={s.l} className="text-center">
                  <div
                    className="font-bold text-xl mb-0.5"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "#6B8AFF",
                    }}
                  >
                    {s.v}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.38)" }}
                  >
                    {s.l}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start"
              style={trans(320)}
            >
              <a
                href="#"
                className="flex items-center gap-3 px-5 py-3 rounded-2xl transition-all hover:scale-105 hover:-translate-y-0.5"
                style={{
                  background: "rgba(28,31,50,0.85)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div className="text-left">
                  <div className="text-white/45 text-[9px]">
                    {t("hero.appStoreSubtitle")}
                  </div>
                  <div
                    className="text-white font-semibold text-sm"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {t("hero.appStore")}
                  </div>
                </div>
              </a>

              <GooglePlayDisabled label={t("hero.androidComingSoon")} />
            </div>
          </div>

          <div
            className="order-1 md:order-2 flex justify-center"
            style={{
              animation: "float 6s ease-in-out infinite",
              opacity: hero ? 1 : 0,
              transition: "opacity .8s ease .15s",
            }}
          >
            <PhoneMockup />
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6">
        <div
          style={{
            height: 1,
            background:
              "linear-gradient(to right,transparent,rgba(91,127,255,0.18),transparent)",
          }}
        />
      </div>

      <section id="features" className="py-24 px-6 md:px-12">
        <div ref={feat.ref} className="max-w-6xl mx-auto">
          <div
            className="text-center mb-14"
            style={{
              opacity: feat.visible ? 1 : 0,
              transform: feat.visible ? "translateY(0)" : "translateY(20px)",
              transition: "opacity .5s ease, transform .5s ease",
            }}
          >
            <span
              className="text-xs font-medium tracking-widest uppercase mb-3 block"
              style={{ color: "#6B8AFF" }}
            >
              {t("features.label")}
            </span>
            <h2
              className="font-bold mb-3 text-white"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(26px,4vw,40px)",
              }}
            >
              {t("features.title")}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.43)", fontSize: 15 }}>
              {t("features.sub")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: t("features.f1Icon"), title: t("features.f1Title"), desc: t("features.f1Desc"), accent: "#5B7FFF" },
              { icon: t("features.f2Icon"), title: t("features.f2Title"), desc: t("features.f2Desc"), accent: "#10B981" },
              { icon: t("features.f3Icon"), title: t("features.f3Title"), desc: t("features.f3Desc"), accent: "#F59E0B" },
              { icon: t("features.f4Icon"), title: t("features.f4Title"), desc: t("features.f4Desc"), accent: "#FF6B6B" },
            ].map((f, i) => (
              <FeatureCard
                key={i}
                icon={f.icon}
                title={f.title}
                desc={f.desc}
                accent={f.accent}
                visible={feat.visible}
                delay={i * 80}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-12 overflow-hidden">
        <div ref={shots.ref} className="max-w-6xl mx-auto">
          <div
            className="text-center mb-14"
            style={{
              opacity: shots.visible ? 1 : 0,
              transform: shots.visible ? "translateY(0)" : "translateY(20px)",
              transition: "opacity .5s ease, transform .5s ease",
            }}
          >
            <span
              className="text-xs font-medium tracking-widest uppercase mb-3 block"
              style={{ color: "#6B8AFF" }}
            >
              {t("screenshots.label")}
            </span>
            <h2
              className="font-bold mb-3 text-white"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(26px,4vw,40px)",
              }}
            >
              {t("screenshots.title")}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.43)", fontSize: 15 }}>
              {t("screenshots.sub")}
            </p>
          </div>

          <div
            className="flex items-end justify-center gap-6 md:gap-10"
            style={{
              opacity: shots.visible ? 1 : 0,
              transform: shots.visible ? "translateY(0)" : "translateY(32px)",
              transition: "opacity .6s ease .1s, transform .6s ease .1s",
            }}
          >
            <div
              className="hidden sm:flex flex-col items-center gap-5"
              style={{ transform: "rotate(-4deg) translateY(24px)", transformOrigin: "bottom center" }}
            >
              <ReadingListPhone />
              <div className="text-center">
                <div className="font-semibold text-white" style={{ fontSize: 14, fontFamily: "var(--font-display)" }}>
                  {t("screenshots.readingList.title")}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", marginTop: 4, maxWidth: 160 }}>
                  {t("screenshots.readingList.desc")}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-5 z-10">
              <div
                style={{
                  filter: "drop-shadow(0 0 32px rgba(91,127,255,0.28)) drop-shadow(0 24px 48px rgba(0,0,0,0.55))",
                }}
              >
                <ReadingLogPhone />
              </div>
              <div className="text-center">
                <div className="font-semibold text-white" style={{ fontSize: 14, fontFamily: "var(--font-display)" }}>
                  {t("screenshots.progress.title")}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", marginTop: 4, maxWidth: 180 }}>
                  {t("screenshots.progress.desc")}
                </div>
              </div>
            </div>

            <div
              className="hidden sm:flex flex-col items-center gap-5"
              style={{ transform: "rotate(4deg) translateY(24px)", transformOrigin: "bottom center" }}
            >
              <StatsPhone />
              <div className="text-center">
                <div className="font-semibold text-white" style={{ fontSize: 14, fontFamily: "var(--font-display)" }}>
                  {t("screenshots.stats.title")}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", marginTop: 4, maxWidth: 160 }}>
                  {t("screenshots.stats.desc")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6">
        <div
          style={{
            height: 1,
            background:
              "linear-gradient(to right,transparent,rgba(91,127,255,0.18),transparent)",
          }}
        />
      </div>

      <section className="py-20 px-6 md:px-12">
        <div ref={detail.ref} className="max-w-6xl mx-auto">
          <div
            className="text-center mb-14"
            style={{
              opacity: detail.visible ? 1 : 0,
              transform: detail.visible ? "translateY(0)" : "translateY(20px)",
              transition: "opacity .5s ease, transform .5s ease",
            }}
          >
            <span
              className="text-xs font-medium tracking-widest uppercase mb-3 block"
              style={{ color: "#6B8AFF" }}
            >
              {t("appDetail.label")}
            </span>
            <h2
              className="font-bold mb-3 text-white"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(26px,4vw,40px)",
              }}
            >
              {t("appDetail.title")}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.43)", fontSize: 15 }}>
              {t("appDetail.sub")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { icon: t("appDetail.d1Icon"), title: t("appDetail.d1Title"), desc: t("appDetail.d1Desc"), accent: "#5B7FFF" },
              { icon: t("appDetail.d2Icon"), title: t("appDetail.d2Title"), desc: t("appDetail.d2Desc"), accent: "#10B981" },
              { icon: t("appDetail.d3Icon"), title: t("appDetail.d3Title"), desc: t("appDetail.d3Desc"), accent: "#F59E0B" },
              { icon: t("appDetail.d4Icon"), title: t("appDetail.d4Title"), desc: t("appDetail.d4Desc"), accent: "#FF6B6B" },
            ].map((item, i) => (
              <div
                key={i}
                className="glass rounded-2xl p-7"
                style={{
                  opacity: detail.visible ? 1 : 0,
                  transform: detail.visible ? "translateY(0)" : "translateY(24px)",
                  transition: `opacity .5s ease ${i * 80}ms, transform .5s ease ${i * 80}ms`,
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{
                      background: `${item.accent}18`,
                      border: `1px solid ${item.accent}2e`,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <h3
                      className="font-semibold text-white mb-2"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 16,
                      }}
                    >
                      {item.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.52)" }}
                    >
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-12">
        <div
          className="max-w-5xl mx-auto rounded-3xl p-10 md:p-16 grid md:grid-cols-2 gap-12 items-center"
          style={{
            background: "rgba(28,31,50,0.55)",
            border: "1px solid rgba(91,127,255,0.1)",
          }}
        >
          <div>
            <span
              className="text-xs font-medium tracking-widest uppercase mb-3 block"
              style={{ color: "#6B8AFF" }}
            >
              {t("howItWorks.label")}
            </span>
            <h2
              className="font-bold mb-3 text-white"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(22px,3vw,34px)",
              }}
            >
              {t("howItWorks.title")}
            </h2>
            <p
              style={{
                color: "rgba(255,255,255,0.43)",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              {t("howItWorks.sub")}
            </p>
          </div>

          <div ref={steps.ref} className="flex flex-col gap-6">
            <Step
              num={1}
              title={t("howItWorks.s1Title")}
              desc={t("howItWorks.s1Desc")}
              visible={steps.visible}
              delay={0}
            />
            <div
              style={{
                width: 1,
                height: 20,
                background: "rgba(91,127,255,0.18)",
                marginLeft: 20,
              }}
            />
            <Step
              num={2}
              title={t("howItWorks.s2Title")}
              desc={t("howItWorks.s2Desc")}
              visible={steps.visible}
              delay={120}
            />
            <div
              style={{
                width: 1,
                height: 20,
                background: "rgba(91,127,255,0.18)",
                marginLeft: 20,
              }}
            />
            <Step
              num={3}
              title={t("howItWorks.s3Title")}
              desc={t("howItWorks.s3Desc")}
              visible={steps.visible}
              delay={240}
            />
          </div>
        </div>
      </section>

      <section id="download" className="py-24 px-6 md:px-12">
        <div
          ref={cta.ref}
          className="max-w-3xl mx-auto text-center"
          style={{
            opacity: cta.visible ? 1 : 0,
            transform: cta.visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity .6s ease, transform .6s ease",
          }}
        >
          <div className="flex justify-center mb-6">
            <Image
              src="/logo.png"
              alt={t("nav.appName")}
              width={80}
              height={80}
              className="rounded-[22px]"
              style={{
                boxShadow:
                  "0 0 40px rgba(91,127,255,0.38), 0 20px 40px rgba(0,0,0,0.5)",
              }}
            />
          </div>

          <h2
            className="font-bold mb-4 text-white"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(26px,4vw,44px)",
            }}
          >
            {t("cta.title")}
          </h2>
          <p
            className="mb-10 text-base"
            style={{
              color: "rgba(255,255,255,0.48)",
              lineHeight: 1.75,
            }}
          >
            {t("cta.sub")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#"
              className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-semibold text-white btn-primary"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              App Store
            </a>
            <div className="flex justify-center">
              <GooglePlayDisabled label={t("hero.androidComingSoon")} />
            </div>
          </div>
        </div>
      </section>

      <footer
        className="px-6 md:px-12 py-10"
        style={{ borderTop: "1px solid rgba(91,127,255,0.08)" }}
      >
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo.png"
                alt={t("nav.appName")}
                width={24}
                height={24}
                className="rounded-lg"
              />
              <span
                className="font-semibold text-sm"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "rgba(255,255,255,0.65)",
                }}
              >
                {t("footer.copyright")}{" "}
                <a
                  href="https://github.com/byungsker"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white/70 transition-colors underline underline-offset-2"
                  style={{ color: "rgba(107,138,255,0.8)" }}
                >
                  {t("footer.developerName")}
                </a>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/byungsker"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white/55 transition-colors"
                style={{ color: "rgba(255,255,255,0.38)" }}
                title="GitHub"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a
                href="mailto:extreme0728@gmail.com"
                className="hover:text-white/55 transition-colors"
                style={{ color: "rgba(255,255,255,0.38)" }}
                title="Email"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </a>
            </div>
          </div>

          <div
            style={{
              height: 1,
              background: "rgba(91,127,255,0.08)",
            }}
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p
              className="text-xs"
              style={{ color: "rgba(255,255,255,0.22)" }}
            >
              {t("footer.tagline")}
            </p>
            <div
              className="flex gap-5 text-xs"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              <a
                href={localePath("/privacy")}
                className="hover:text-white/55 transition-colors"
              >
                {t("footer.privacy")}
              </a>
              <a
                href={localePath("/terms")}
                className="hover:text-white/55 transition-colors"
              >
                {t("footer.terms")}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
