"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BarChart3, Bot, ClipboardList, FileText, Mail, Megaphone, Rocket, Search, Users, type LucideIcon } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

const navItems: readonly { readonly href: string; readonly label: string; readonly icon: LucideIcon }[] = [
  { href: "/admin", label: "대시보드", icon: BarChart3 },
  { href: "/admin/ai-usage", label: "AI 운영", icon: Bot },
  { href: "/admin/ai-monitor", label: "AI 모니터", icon: Search },
  { href: "/admin/users", label: "유저 관리", icon: Users },
  { href: "/admin/push-templates", label: "푸시 템플릿", icon: FileText },
  { href: "/admin/push-logs", label: "발송 로그", icon: ClipboardList },
  { href: "/admin/test-push", label: "테스트 발송", icon: Rocket },
  { href: "/admin/announcements", label: "공지 발송", icon: Megaphone },
  { href: "/admin/waitlist", label: "출시 알림 명단", icon: Mail },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

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
    <div className="min-h-screen bg-background text-foreground">
      <nav className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex min-w-0">
              <Link href="/admin" className="flex-shrink-0 flex items-center gap-2">
                <Image
                  src="/logo-bookgolas.png"
                  alt="북골라스"
                  width={32}
                  height={32}
                  className="rounded-md"
                />
                <span className="text-xl font-bold text-foreground">북골라스</span>
                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">Admin</span>
              </Link>
              <div className="hidden min-w-0 overflow-x-auto sm:ml-6 sm:flex sm:space-x-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex shrink-0 items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      pathname === item.href || (item.href === "/admin/ai-monitor" && pathname.startsWith("/admin/ai-monitor/"))
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <item.icon aria-hidden="true" className="mr-2 size-4" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {userEmail && (
                <span className="text-sm text-muted-foreground">{userEmail}</span>
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
