"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Loader2,
  ListTodo,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  GripVertical,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  defaultAlertEnabled: boolean;
  children: TaskTemplate[];
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Dialog states
  const [isAddMainOpen, setIsAddMainOpen] = useState(false);
  const [isAddChildOpen, setIsAddChildOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);

  // Form states
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAlertEnabled, setFormAlertEnabled] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/templates");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTemplates(data);
      // 기본으로 모두 펼침
      setExpandedIds(new Set(data.map((t: TaskTemplate) => t.id)));
    } catch (error) {
      console.error(error);
      toast.error("템플릿 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormAlertEnabled(false);
    setSelectedParentId(null);
    setSelectedTemplate(null);
    setSelectedChildId(null);
  };

  // 시스템 템플릿 복사
  const handleCopySystem = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/templates/copy-system", {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to copy");
      }

      const result = await res.json();
      toast.success(
        `시스템 템플릿이 복사되었습니다. (${result.mainCount}개 메인, ${result.childCount}개 하위)`
      );
      setIsCopyOpen(false);
      fetchTemplates();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "복사에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 메인 템플릿 추가
  const handleAddMain = async () => {
    if (!formName.trim()) {
      toast.error("이름을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          defaultAlertEnabled: formAlertEnabled,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create");
      }

      toast.success("메인 단계가 추가되었습니다.");
      setIsAddMainOpen(false);
      resetForm();
      fetchTemplates();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "추가에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 하위 템플릿 추가
  const handleAddChild = async () => {
    if (!formName.trim() || !selectedParentId) {
      toast.error("이름을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/templates/${selectedParentId}/children`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          defaultAlertEnabled: formAlertEnabled,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create");
      }

      toast.success("하위 단계가 추가되었습니다.");
      setIsAddChildOpen(false);
      resetForm();
      fetchTemplates();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "추가에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 템플릿 수정
  const handleEdit = async () => {
    if (!formName.trim() || !selectedTemplate) {
      toast.error("이름을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 하위 템플릿인 경우
      if (selectedParentId && selectedChildId) {
        const res = await fetch(`/api/admin/templates/${selectedParentId}/children`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId: selectedChildId,
            name: formName.trim(),
            description: formDescription.trim() || null,
            defaultAlertEnabled: formAlertEnabled,
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to update");
        }
      } else {
        // 메인 템플릿인 경우
        const res = await fetch(`/api/admin/templates/${selectedTemplate.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            description: formDescription.trim() || null,
            defaultAlertEnabled: formAlertEnabled,
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to update");
        }
      }

      toast.success("수정되었습니다.");
      setIsEditOpen(false);
      resetForm();
      fetchTemplates();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "수정에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 템플릿 삭제
  const handleDelete = async () => {
    if (!selectedTemplate) return;

    setIsSubmitting(true);
    try {
      // 하위 템플릿인 경우
      if (selectedParentId && selectedChildId) {
        const res = await fetch(
          `/api/admin/templates/${selectedParentId}/children?childId=${selectedChildId}`,
          { method: "DELETE" }
        );

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to delete");
        }
      } else {
        // 메인 템플릿인 경우
        const res = await fetch(`/api/admin/templates/${selectedTemplate.id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to delete");
        }
      }

      toast.success("삭제되었습니다.");
      setIsDeleteOpen(false);
      resetForm();
      fetchTemplates();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 수정 다이얼로그 열기
  const openEditDialog = (
    template: TaskTemplate,
    parentId?: string,
    childId?: string
  ) => {
    setSelectedTemplate(template);
    setSelectedParentId(parentId || null);
    setSelectedChildId(childId || null);
    setFormName(template.name);
    setFormDescription(template.description || "");
    setFormAlertEnabled(template.defaultAlertEnabled);
    setIsEditOpen(true);
  };

  // 삭제 다이얼로그 열기
  const openDeleteDialog = (
    template: TaskTemplate,
    parentId?: string,
    childId?: string
  ) => {
    setSelectedTemplate(template);
    setSelectedParentId(parentId || null);
    setSelectedChildId(childId || null);
    setIsDeleteOpen(true);
  };

  // 하위 추가 다이얼로그 열기
  const openAddChildDialog = (parentId: string) => {
    resetForm();
    setSelectedParentId(parentId);
    setIsAddChildOpen(true);
  };

  const hasTemplates = templates.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">조직 템플릿 관리</h1>
          <p className="text-muted-foreground mt-1">
            우리 조직만의 프로젝트 단계 템플릿을 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          {!hasTemplates && (
            <AlertDialog open={isCopyOpen} onOpenChange={setIsCopyOpen}>
              <Button variant="outline" onClick={() => setIsCopyOpen(true)}>
                <Copy className="h-4 w-4 mr-2" />
                시스템 템플릿에서 복사
              </Button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>시스템 템플릿 복사</AlertDialogTitle>
                  <AlertDialogDescription>
                    시스템 기본 템플릿을 조직 템플릿으로 복사합니다.
                    복사 후에는 자유롭게 수정할 수 있습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isSubmitting}>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCopySystem} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    복사하기
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Dialog open={isAddMainOpen} onOpenChange={setIsAddMainOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                새 단계 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>메인 단계 추가</DialogTitle>
                <DialogDescription>
                  새로운 메인 단계를 추가합니다.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">이름 *</Label>
                  <Input
                    id="name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="예: 인허가"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">설명</Label>
                  <Textarea
                    id="description"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="단계에 대한 설명"
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="alertEnabled"
                    checked={formAlertEnabled}
                    onCheckedChange={(checked) =>
                      setFormAlertEnabled(checked === true)
                    }
                  />
                  <Label htmlFor="alertEnabled" className="cursor-pointer">
                    기본 알림 활성화
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddMainOpen(false)}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button onClick={handleAddMain} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  추가
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 상태 표시 */}
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 py-4">
          {hasTemplates ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="font-medium">우리 조직 커스텀 템플릿 사용 중</span>
              <Badge variant="secondary">{templates.length}개 메인 단계</Badge>
            </>
          ) : (
            <>
              <ListTodo className="h-5 w-5 text-muted-foreground" />
              <span className="text-muted-foreground">시스템 기본 템플릿 사용 중</span>
              <Badge variant="outline">커스텀 없음</Badge>
            </>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !hasTemplates ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ListTodo className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">조직 전용 템플릿이 없습니다.</p>
            <p className="text-sm text-muted-foreground mb-4">
              시스템 템플릿을 복사하거나 새로 만들어보세요.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsCopyOpen(true)}>
                <Copy className="h-4 w-4 mr-2" />
                시스템 템플릿에서 복사
              </Button>
              <Button onClick={() => setIsAddMainOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                새로 만들기
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              전체 {templates.length}개 메인 단계
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="border rounded-lg overflow-hidden"
              >
                {/* 메인 템플릿 */}
                <div
                  className={cn(
                    "flex items-center gap-2 p-3 bg-muted/50",
                    template.children.length > 0 && "cursor-pointer"
                  )}
                  onClick={() =>
                    template.children.length > 0 && toggleExpand(template.id)
                  }
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

                  {template.children.length > 0 ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                    >
                      {expandedIds.has(template.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  ) : (
                    <div className="w-6" />
                  )}

                  <span className="font-medium flex-1">{template.name}</span>

                  <span className="text-sm text-muted-foreground">
                    {template.children.length}개 하위 단계
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAddChildDialog(template.id);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(template);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(template);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* 하위 템플릿 */}
                {expandedIds.has(template.id) && template.children.length > 0 && (
                  <div className="border-t">
                    {template.children.map((child, index) => (
                      <div
                        key={child.id}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 pl-14",
                          index < template.children.length - 1 &&
                            "border-b border-dashed"
                        )}
                      >
                        <span className="text-muted-foreground text-sm w-4">
                          {index === template.children.length - 1 ? "└" : "├"}
                        </span>
                        <span className="flex-1 text-sm">{child.name}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() =>
                              openEditDialog(child, template.id, child.id)
                            }
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() =>
                              openDeleteDialog(child, template.id, child.id)
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 하위 단계 추가 Dialog */}
      <Dialog open={isAddChildOpen} onOpenChange={setIsAddChildOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>하위 단계 추가</DialogTitle>
            <DialogDescription>
              선택한 메인 단계에 하위 단계를 추가합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="childName">이름 *</Label>
              <Input
                id="childName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="예: 발전사업허가"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="childDescription">설명</Label>
              <Textarea
                id="childDescription"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="단계에 대한 설명"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="childAlertEnabled"
                checked={formAlertEnabled}
                onCheckedChange={(checked) =>
                  setFormAlertEnabled(checked === true)
                }
              />
              <Label htmlFor="childAlertEnabled" className="cursor-pointer">
                기본 알림 활성화
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddChildOpen(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button onClick={handleAddChild} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 수정 Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedChildId ? "하위 단계 수정" : "메인 단계 수정"}
            </DialogTitle>
            <DialogDescription>단계 정보를 수정합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">이름 *</Label>
              <Input
                id="editName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDescription">설명</Label>
              <Textarea
                id="editDescription"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="editAlertEnabled"
                checked={formAlertEnabled}
                onCheckedChange={(checked) =>
                  setFormAlertEnabled(checked === true)
                }
              />
              <Label htmlFor="editAlertEnabled" className="cursor-pointer">
                기본 알림 활성화
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedChildId
                ? `"${selectedTemplate?.name}" 하위 단계를 삭제하시겠습니까?`
                : `"${selectedTemplate?.name}" 메인 단계를 삭제하시겠습니까? 하위 단계도 모두 삭제됩니다.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
