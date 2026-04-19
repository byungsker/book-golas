"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type UserProfile, type UserRole, ROLE_CONFIG } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";

const SUBSCRIPTION_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  free: { label: "Free", variant: "outline" },
  pro_monthly: { label: "Pro (Monthly)", variant: "default" },
  pro_yearly: { label: "Pro (Yearly)", variant: "default" },
  pro_lifetime: { label: "Pro (Lifetime)", variant: "default" },
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    user: UserProfile | null;
    newRole: UserRole | null;
  }>({ open: false, user: null, newRole: null });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    }
    init();
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleRoleChange(user: UserProfile, newRole: UserRole) {
    if (newRole === user.role) return;
    setConfirmDialog({ open: true, user, newRole });
  }

  async function confirmRoleChange() {
    if (!confirmDialog.user || !confirmDialog.newRole) return;

    setUpdating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: confirmDialog.user.id,
          role: confirmDialog.newRole,
        }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === confirmDialog.user!.id
              ? { ...u, role: confirmDialog.newRole! }
              : u
          )
        );
      }
    } finally {
      setUpdating(false);
      setConfirmDialog({ open: false, user: null, newRole: null });
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.nickname && u.nickname.toLowerCase().includes(search.toLowerCase())) ||
      (u.name && u.name.toLowerCase().includes(search.toLowerCase()))
  );

  const adminCount = users.filter((u) => u.role === "admin").length;
  const proCount = users.filter((u) => u.subscription_status !== "free").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">유저 관리</h1>
        <p className="text-muted-foreground mt-1">
          사용자 역할 및 구독 상태를 관리합니다.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">전체 유저</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">관리자</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-500">{adminCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pro 구독자</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-yellow-500">{proCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="이메일 또는 이름으로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground">
          {filteredUsers.length}명 표시
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이메일</TableHead>
                <TableHead>이름</TableHead>
                <TableHead>역할</TableHead>
                <TableHead>구독</TableHead>
                <TableHead>가입일</TableHead>
                <TableHead>최근 로그인</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {search ? "검색 결과가 없습니다." : "유저가 없습니다."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {user.email}
                        {user.id === currentUserId && (
                          <Badge variant="outline" className="text-xs">나</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.nickname || user.name || "-"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(value: UserRole) => handleRoleChange(user, value)}
                      >
                        <SelectTrigger className="w-[120px]" size="sm">
                          <SelectValue>
                            <Badge variant={ROLE_CONFIG[user.role].variant}>
                              {ROLE_CONFIG[user.role].label}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ROLE_CONFIG) as UserRole[]).map((role) => (
                            <SelectItem key={role} value={role}>
                              <Badge variant={ROLE_CONFIG[role].variant}>
                                {ROLE_CONFIG[role].label}
                              </Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={SUBSCRIPTION_LABELS[user.subscription_status]?.variant || "outline"}>
                        {SUBSCRIPTION_LABELS[user.subscription_status]?.label || user.subscription_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(user.created_at).toLocaleDateString("ko-KR")}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {user.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleDateString("ko-KR")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog({ open: false, user: null, newRole: null });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>역할 변경 확인</DialogTitle>
            <DialogDescription>
              {confirmDialog.user && confirmDialog.newRole && (
                <>
                  <strong>{confirmDialog.user.email}</strong>의 역할을{" "}
                  <Badge variant={ROLE_CONFIG[confirmDialog.user.role].variant}>
                    {ROLE_CONFIG[confirmDialog.user.role].label}
                  </Badge>{" "}
                  에서{" "}
                  <Badge variant={ROLE_CONFIG[confirmDialog.newRole].variant}>
                    {ROLE_CONFIG[confirmDialog.newRole].label}
                  </Badge>{" "}
                  로 변경하시겠습니까?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, user: null, newRole: null })}
              disabled={updating}
            >
              취소
            </Button>
            <Button
              onClick={confirmRoleChange}
              disabled={updating}
            >
              {updating ? "변경 중..." : "변경"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
