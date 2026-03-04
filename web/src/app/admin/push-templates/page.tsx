"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase, PushTemplate } from "@/lib/supabase";

export default function PushTemplatesPage() {
  const [templates, setTemplates] = useState<PushTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<PushTemplate | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const { data, error } = await supabase
        .from("push_templates")
        .select("*")
        .order("priority", { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!editingTemplate) return;

    try {
      const { error } = await supabase
        .from("push_templates")
        .update({
          title: editingTemplate.title,
          body_template: editingTemplate.body_template,
          title_en: editingTemplate.title_en,
          body_template_en: editingTemplate.body_template_en,
          is_active: editingTemplate.is_active,
          priority: editingTemplate.priority,
        })
        .eq("id", editingTemplate.id);

      if (error) throw error;

      setIsDialogOpen(false);
      fetchTemplates();
    } catch (error) {
      console.error("Failed to update template:", error);
      alert("저장에 실패했습니다.");
    }
  }

  async function toggleActive(template: PushTemplate) {
    try {
      const { error } = await supabase
        .from("push_templates")
        .update({ is_active: !template.is_active })
        .eq("id", template.id);

      if (error) throw error;
      fetchTemplates();
    } catch (error) {
      console.error("Failed to toggle active:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">푸시 템플릿 관리</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>템플릿 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Type</TableHead>
                <TableHead>Title (KO)</TableHead>
                <TableHead>Title (EN)</TableHead>
                <TableHead>Body Template (KO)</TableHead>
                <TableHead className="w-24 text-center">Active</TableHead>
                <TableHead className="w-24 text-center">Priority</TableHead>
                <TableHead className="w-24 text-center">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <Badge variant="outline">{template.type}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{template.title}</TableCell>
                  <TableCell className="text-muted-foreground">{template.title_en || "-"}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {template.body_template}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={() => toggleActive(template)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    {template.priority}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingTemplate(template);
                        setIsDialogOpen(true);
                      }}
                    >
                      ✏️
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>사용 가능 변수</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Badge>{'{days}'}</Badge>
            <Badge>{'{bookTitle}'}</Badge>
            <Badge>{'{percent}'}</Badge>
            <Badge>{'{targetPages}'}</Badge>
            <Badge>{'{daysLeft}'}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Body Template에서 위 변수를 사용하면 실제 값으로 치환됩니다.
          </p>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              템플릿 수정: {editingTemplate?.type}
            </DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title (KO)</Label>
                <Input
                  id="title"
                  value={editingTemplate.title}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      title: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title_en">Title (EN)</Label>
                <Input
                  id="title_en"
                  value={editingTemplate.title_en || ""}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      title_en: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Body Template (KO)</Label>
                <textarea
                  id="body"
                  className="w-full min-h-20 px-3 py-2 border border-border rounded-md text-sm bg-background text-foreground"
                  value={editingTemplate.body_template}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      body_template: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body_en">Body Template (EN)</Label>
                <textarea
                  id="body_en"
                  className="w-full min-h-20 px-3 py-2 border border-border rounded-md text-sm bg-background text-foreground"
                  value={editingTemplate.body_template_en || ""}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      body_template_en: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="active">Active</Label>
                  <Switch
                    id="active"
                    checked={editingTemplate.is_active}
                    onCheckedChange={(checked) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        is_active: checked,
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    className="w-20"
                    value={editingTemplate.priority}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        priority: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSave}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
