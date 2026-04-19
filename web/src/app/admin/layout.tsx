"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/admin/theme-toggle";

const navItems = [
  { href: "/admin", label: "대시보드", icon: "📊" },
  { href: "/admin/users", label: "유저 관리", icon: "👥" },
  { href: "/admin/push-templates", label: "푸시 템플릿", icon: "📝" },
  { href: "/admin/push-logs", label: "발송 로그", icon: "📋" },
  { href: "/admin/test-push", label: "테스트 발송", icon: "🚀" },
  { href: "/admin/announcements", label: "공지 발송", icon: "📢" },
  { href: "/admin/waitlist", label: "출시 알림 명단", icon: "📧" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
    }
    getUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 2xl:max-w-screen-2xl">
          <div className="flex justify-between h-16 gap-4">
            <div className="flex items-center min-w-0">
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="xl:hidden mr-2 text-foreground"
                    aria-label="메뉴 열기"
                  >
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <SheetHeader className="border-b border-border">
                    <SheetTitle className="flex items-center gap-2">
                      <Image
                        src="/logo-bookgolas.png"
                        alt="북골라스"
                        width={28}
                        height={28}
                        className="rounded-md"
                      />
                      <span className="text-base font-bold text-foreground">북골라스</span>
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        Admin
                      </span>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-1 p-3">
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileNavOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          pathname === item.href
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground hover:bg-accent/60"
                        )}
                      >
                        <span className="text-base">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>

              <Link href="/admin" className="flex-shrink-0 flex items-center gap-2">
                <Image
                  src="/logo-bookgolas.png"
                  alt="북골라스"
                  width={32}
                  height={32}
                  className="rounded-md"
                />
                <span className="text-xl font-bold text-foreground">북골라스</span>
                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  Admin
                </span>
              </Link>
              <div className="hidden xl:ml-8 xl:flex xl:items-center xl:gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center whitespace-nowrap px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      pathname === item.href
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {userEmail && (
                <span className="hidden 2xl:inline text-sm text-muted-foreground truncate max-w-[180px]">
                  {userEmail}
                </span>
              )}
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={handleLogout}>
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
