"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { PushTemplate } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface UserWithToken {
  user_id: string;
  email: string;
  token_count: number;
  device_type: string;
}

// 템플릿별 필요한 변수 정의
const TEMPLATE_VARIABLES: Record<string, string[]> = {
  inactive: ["days", "bookTitle"],
  deadline: ["bookTitle", "days"],
  progress: ["bookTitle", "percent"],
  streak: ["days"],
  achievement: ["bookTitle"],
};

export default function TestPushPage() {
  const [templates, setTemplates] = useState<PushTemplate[]>([]);
  const [users, setUsers] = useState<UserWithToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form state
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("custom");
  const [customTitle, setCustomTitle] = useState("테스트 푸시 알림");
  const [customBody, setCustomBody] = useState("이것은 테스트 메시지입니다.");

  // 템플릿 변수 값
  const [variables, setVariables] = useState<Record<string, string>>({
    days: "3",
    bookTitle: "클린 코드",
    percent: "85",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    // Fetch templates
    const { data: templatesData, error: templatesError } = await supabase
      .from("push_templates")
      .select("*")
      .eq("is_active", true)
      .order("priority");

    console.log("Templates:", templatesData, templatesError);

    if (templatesData) {
      setTemplates(templatesData);
    }

    // Fetch ALL users with FCM tokens via API route (bypasses RLS)
    try {
      const response = await fetch("/api/admin/fcm-tokens");
      const data = await response.json();

      console.log("FCM Tokens API response:", data);

      if (data.users && data.users.length > 0) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Error fetching FCM tokens:", error);
    }

    setLoading(false);
  }

  // 변수 치환 함수
  function replaceVariables(text: string): string {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }
    return result;
  }

  async function handleSendTest() {
    if (!selectedUser) {
      setResult({ success: false, message: "사용자를 선택해주세요." });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const selectedTemplateData = templates.find((t) => t.type === selectedTemplate);

      let title: string;
      let body: string;

      if (selectedTemplate === "custom") {
        title = customTitle;
        body = customBody;
      } else if (selectedTemplateData) {
        // 템플릿의 변수를 치환
        title = selectedTemplateData.title;
        body = replaceVariables(selectedTemplateData.body_template);
      } else {
        title = customTitle;
        body = customBody;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-test-push`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            userId: selectedUser,
            title,
            body,
            pushType: selectedTemplate === "custom" ? "test" : selectedTemplate,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: `발송 성공! ${data.sentCount}개 디바이스에 전송되었습니다.`,
        });
      } else {
        setResult({
          success: false,
          message: data.error || "발송에 실패했습니다.",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: `에러 발생: ${error instanceof Error ? error.message : "알 수 없는 에러"}`,
      });
    } finally {
      setSending(false);
    }
  }

  const selectedTemplateData = templates.find((t) => t.type === selectedTemplate);
  const requiredVariables = selectedTemplate !== "custom" ? TEMPLATE_VARIABLES[selectedTemplate] || [] : [];

  // 미리보기용 본문 (변수 치환 적용)
  const previewBody =
    selectedTemplate === "custom"
      ? customBody
      : selectedTemplateData
        ? replaceVariables(selectedTemplateData.body_template)
        : "본문";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">테스트 발송</h1>
        <p className="text-muted-foreground">특정 사용자에게 테스트 푸시 알림을 발송합니다.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 발송 설정 */}
        <Card>
          <CardHeader>
            <CardTitle>발송 설정</CardTitle>
            <CardDescription>테스트 푸시를 보낼 대상과 내용을 설정하세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 사용자 선택 */}
            <div className="space-y-2">
              <Label htmlFor="user">대상 사용자</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="사용자 선택..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.email} ({user.token_count}개 디바이스, {user.device_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                FCM 토큰이 등록된 사용자: {users.length}명
              </p>
            </div>

            {/* 템플릿 선택 */}
            <div className="space-y-2">
              <Label htmlFor="template">메시지 템플릿</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="템플릿 선택..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">커스텀 메시지</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.type} value={template.type}>
                      {template.type} - {template.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 커스텀 메시지 입력 */}
            {selectedTemplate === "custom" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="title">제목</Label>
                  <Input
                    id="title"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="푸시 알림 제목"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">본문</Label>
                  <Input
                    id="body"
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    placeholder="푸시 알림 본문"
                  />
                </div>
              </>
            )}

            {/* 템플릿 변수 입력 */}
            {selectedTemplate !== "custom" && requiredVariables.length > 0 && (
              <div className="space-y-3 p-3 bg-muted rounded-lg">
                <Label className="text-sm font-medium">템플릿 변수</Label>
                {requiredVariables.map((varName) => (
                  <div key={varName} className="space-y-1">
                    <Label htmlFor={varName} className="text-xs text-muted-foreground">
                      {varName === "days" && "일수 (days)"}
                      {varName === "bookTitle" && "책 제목 (bookTitle)"}
                      {varName === "percent" && "진행률 % (percent)"}
                    </Label>
                    <Input
                      id={varName}
                      value={variables[varName] || ""}
                      onChange={(e) =>
                        setVariables((prev) => ({ ...prev, [varName]: e.target.value }))
                      }
                      placeholder={`{${varName}} 값 입력`}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* 발송 버튼 */}
            <Button onClick={handleSendTest} disabled={sending || !selectedUser} className="w-full">
              {sending ? "발송 중..." : "테스트 발송"}
            </Button>

            {/* 결과 메시지 */}
            {result && (
              <div
                className={`p-3 rounded-md text-sm ${
                  result.success
                    ? "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400"
                    : "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400"
                }`}
              >
                {result.message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 미리보기 */}
        <Card>
          <CardHeader>
            <CardTitle>미리보기</CardTitle>
            <CardDescription>발송될 푸시 알림 미리보기</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-white p-4 rounded-xl shadow-lg max-w-sm">
              <div className="flex items-start gap-3">
                <img src="/logo-bookgolas.png" alt="북골라스" className="w-10 h-10 rounded-lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">북골라스</span>
                    <span className="text-xs text-gray-400">now</span>
                  </div>
                  <p className="font-medium text-sm mt-1">
                    {selectedTemplate === "custom"
                      ? customTitle
                      : selectedTemplateData?.title || "제목"}
                  </p>
                  <p className="text-sm text-gray-300 mt-0.5">{previewBody}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <h4 className="font-medium text-sm text-foreground">발송 정보</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">타입</span>
                  <Badge variant="outline">
                    {selectedTemplate === "custom" ? "test" : selectedTemplate}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">대상</span>
                  <span className="text-foreground">
                    {selectedUser ? users.find((u) => u.user_id === selectedUser)?.email : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">디바이스</span>
                  <span className="text-foreground">
                    {selectedUser
                      ? users.find((u) => u.user_id === selectedUser)?.token_count || 0
                      : 0}
                    개
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 사용자 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>FCM 토큰 보유 사용자</CardTitle>
          <CardDescription>
            총 {users.length}명의 사용자가 푸시 알림을 받을 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">로딩 중...</p>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-2">FCM 토큰이 등록된 사용자가 없습니다.</p>
              <p className="text-xs text-muted-foreground/70">
                앱에서 푸시 알림을 허용한 사용자만 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {users.map((user) => (
                <div
                  key={user.user_id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedUser === user.user_id
                      ? "border-blue-500 bg-blue-500/10"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => setSelectedUser(user.user_id)}
                >
                  <div className="text-sm font-medium text-foreground">{user.email}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{user.token_count}개 디바이스</span>
                    <Badge variant="secondary" className="text-xs">
                      {user.device_type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
