"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus,
  Loader2,
  ListTodo,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  GripVertical,
  FileCheck,
  ClipboardList,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistTemplate {
  id: string;
  name: string;
  sortOrder: number;
  taskTemplateId: string;
}

interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  defaultAlertEnabled: boolean;
  isPermitTask: boolean;
  processingDays: number | null;
  phase: "PERMIT" | "CONSTRUCTION" | "OTHER" | null;
  children: TaskTemplate[];
  checklistTemplates?: ChecklistTemplate[];
}

const PHASE_OPTIONS = [
  { value: "PERMIT", label: "인허가", color: "text-blue-600" },
  { value: "CONSTRUCTION", label: "시공 (60% 가중치)", color: "text-orange-600" },
  { value: "OTHER", label: "기타", color: "text-gray-600" },
] as const;

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Dialog states
  const [isAddMainOpen, setIsAddMainOpen] = useState(false);
  const [isAddChildOpen, setIsAddChildOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form states
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAlertEnabled, setFormAlertEnabled] = useState(false);
  const [formPhase, setFormPhase] = useState<"PERMIT" | "CONSTRUCTION" | "OTHER" | "">("");
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/super/templates");
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
    setFormPhase("");
    setSelectedParentId(null);
    setSelectedTemplate(null);
    setSelectedChildId(null);
  };

  // 순서 저장 공통 함수
  const saveOrder = async (url: string, body: object) => {
    setIsSaving(true);
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save order");
      toast.success("순서가 저장되었습니다");
    } catch (error) {
      toast.error("순서 저장에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  // 메인 템플릿 드래그 앤 드롭
  const handleMainDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = templates.findIndex((t) => t.id === active.id);
    const newIndex = templates.findIndex((t) => t.id === over.id);
    const newTemplates = arrayMove(templates, oldIndex, newIndex);

    setTemplates(newTemplates);
    await saveOrder("/api/super/templates/reorder", {
      orderedIds: newTemplates.map((t) => t.id),
    });
  };

  // 하위 템플릿 드래그 앤 드롭
  const handleChildDragEnd = async (parentId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setTemplates((prev) =>
      prev.map((template) => {
        if (template.id !== parentId) return template;

        const oldIndex = template.children.findIndex((c) => c.id === active.id);
        const newIndex = template.children.findIndex((c) => c.id === over.id);
        const newChildren = arrayMove(template.children, oldIndex, newIndex);

        // API 호출
        saveOrder(`/api/super/templates/${parentId}/children/reorder`, {
          orderedIds: newChildren.map((c) => c.id),
        });

        return { ...template, children: newChildren };
      })
    );
  };

  // 메인 템플릿 추가
  const handleAddMain = async () => {
    if (!formName.trim()) {
      toast.error("이름을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/super/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          defaultAlertEnabled: formAlertEnabled,
          phase: formPhase || null,
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
      const res = await fetch(`/api/super/templates/${selectedParentId}/children`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          defaultAlertEnabled: formAlertEnabled,
          phase: formPhase || null,
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
        const res = await fetch(`/api/super/templates/${selectedParentId}/children`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId: selectedChildId,
            name: formName.trim(),
            description: formDescription.trim() || null,
            defaultAlertEnabled: formAlertEnabled,
            phase: formPhase || null,
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to update");
        }
      } else {
        // 메인 템플릿인 경우
        const res = await fetch(`/api/super/templates/${selectedTemplate.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            description: formDescription.trim() || null,
            defaultAlertEnabled: formAlertEnabled,
            phase: formPhase || null,
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
          `/api/super/templates/${selectedParentId}/children?childId=${selectedChildId}`,
          { method: "DELETE" }
        );

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to delete");
        }
      } else {
        // 메인 템플릿인 경우
        const res = await fetch(`/api/super/templates/${selectedTemplate.id}`, {
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
    setFormPhase(template.phase || "");
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">시스템 템플릿 관리</h1>
          <p className="text-muted-foreground mt-1">
            드래그하여 순서를 변경할 수 있습니다.
          </p>
        </div>
        <Dialog open={isAddMainOpen} onOpenChange={setIsAddMainOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              메인 단계 추가
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
              <div className="space-y-2">
                <Label>단계 속성</Label>
                <Select value={formPhase} onValueChange={(v) => setFormPhase(v as typeof formPhase)}>
                  <SelectTrigger>
                    <SelectValue placeholder="단계 속성 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    {PHASE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className={option.color}>{option.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ListTodo className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">등록된 템플릿이 없습니다.</p>
            <Button onClick={() => setIsAddMainOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              첫 단계 만들기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              전체 {templates.length}개 메인 단계
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleMainDragEnd}
            >
              <SortableContext
                items={templates.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {templates.map((template, index) => (
                    <SortableMainTemplate
                      key={template.id}
                      template={template}
                      index={index}
                      isExpanded={expandedIds.has(template.id)}
                      onToggleExpand={() => toggleExpand(template.id)}
                      onChildDragEnd={(e) => handleChildDragEnd(template.id, e)}
                      sensors={sensors}
                      onAddChild={() => openAddChildDialog(template.id)}
                      onEdit={(t, pId, cId) => openEditDialog(t, pId, cId)}
                      onDelete={(t, pId, cId) => openDeleteDialog(t, pId, cId)}
                      onChecklistChange={fetchTemplates}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      )}

      {/* 저장 중 인디케이터 */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <Loader2 className="h-4 w-4 animate-spin" />
          저장 중...
        </div>
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
            <div className="space-y-2">
              <Label>단계 속성</Label>
              <Select value={formPhase} onValueChange={(v) => setFormPhase(v as typeof formPhase)}>
                <SelectTrigger>
                  <SelectValue placeholder="단계 속성 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  {PHASE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className={option.color}>{option.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div className="space-y-2">
              <Label>단계 속성</Label>
              <Select value={formPhase} onValueChange={(v) => setFormPhase(v as typeof formPhase)}>
                <SelectTrigger>
                  <SelectValue placeholder="단계 속성 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  {PHASE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className={option.color}>{option.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

// 메인 템플릿 Sortable 컴포넌트
interface SortableMainTemplateProps {
  template: TaskTemplate;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onChildDragEnd: (event: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
  onAddChild: () => void;
  onEdit: (template: TaskTemplate, parentId?: string, childId?: string) => void;
  onDelete: (template: TaskTemplate, parentId?: string, childId?: string) => void;
  onChecklistChange: () => void;
}

function SortableMainTemplate({
  template,
  index,
  isExpanded,
  onToggleExpand,
  onChildDragEnd,
  sensors,
  onAddChild,
  onEdit,
  onDelete,
  onChecklistChange,
}: SortableMainTemplateProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: template.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border rounded-lg bg-card transition-shadow",
        isDragging && "shadow-lg ring-2 ring-primary ring-offset-2 z-50"
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        {/* 메인 템플릿 헤더 */}
        <div className="flex flex-wrap items-center gap-2 p-3">
          {/* 드래그 핸들 */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none shrink-0 hidden sm:block"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* 순서 번호 */}
          <span className="text-sm text-muted-foreground w-6 text-center shrink-0 hidden sm:block">
            {index + 1}
          </span>

          {/* 펼침/접힘 (하위 태스크 있을 때만) */}
          {template.children.length > 0 && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
          )}

          {/* 템플릿 이름 */}
          <span className="font-medium flex-1 min-w-0">{template.name}</span>

          {/* 인허가 배지 */}
          {template.isPermitTask && (
            <Badge variant="outline" className="text-blue-600 border-blue-200 shrink-0 hidden sm:flex">
              <FileCheck className="h-3 w-3 mr-1" />
              인허가 {template.processingDays}일
            </Badge>
          )}

          {/* 하위 태스크 수 */}
          {template.children.length > 0 && (
            <>
              <Badge variant="secondary" className="shrink-0 hidden sm:inline-flex">하위 {template.children.length}</Badge>
              <Badge variant="secondary" className="shrink-0 sm:hidden text-xs">({template.children.length})</Badge>
            </>
          )}

          {/* 액션 버튼 */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onAddChild();
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(template);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(template);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 하위 태스크 목록 */}
        <CollapsibleContent>
          {template.children.length > 0 && (
            <div className="border-t bg-muted/30 p-3 pl-12">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onChildDragEnd}
              >
                <SortableContext
                  items={template.children.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {template.children.map((child, childIndex) => (
                      <SortableChildTemplate
                        key={child.id}
                        template={child}
                        index={childIndex}
                        parentId={template.id}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onChecklistChange={onChecklistChange}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// 하위 템플릿 Sortable 컴포넌트
interface SortableChildTemplateProps {
  template: TaskTemplate;
  index: number;
  parentId: string;
  onEdit: (template: TaskTemplate, parentId?: string, childId?: string) => void;
  onDelete: (template: TaskTemplate, parentId?: string, childId?: string) => void;
  onChecklistChange: () => void;
}

function SortableChildTemplate({
  template,
  index,
  parentId,
  onEdit,
  onDelete,
  onChecklistChange,
}: SortableChildTemplateProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newChecklistName, setNewChecklistName] = useState("");
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistName, setEditingChecklistName] = useState("");
  const [localChecklists, setLocalChecklists] = useState<ChecklistTemplate[]>(
    template.checklistTemplates || []
  );

  // 체크리스트 DnD sensors
  const checklistSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: template.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // 외부에서 checklistTemplates가 변경되면 로컬 상태도 업데이트
  useEffect(() => {
    setLocalChecklists(template.checklistTemplates || []);
  }, [template.checklistTemplates]);

  const checklists = localChecklists;

  // 체크리스트 순서 변경
  const handleChecklistDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = checklists.findIndex((c) => c.id === active.id);
    const newIndex = checklists.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(checklists, oldIndex, newIndex);

    // 로컬 상태 먼저 업데이트 (낙관적 업데이트)
    setLocalChecklists(reordered);

    try {
      const res = await fetch(
        `/api/super/templates/${template.id}/checklists/reorder`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: reordered.map((c) => c.id) }),
        }
      );

      if (!res.ok) throw new Error("Failed to reorder");
      toast.success("순서가 변경되었습니다.");
    } catch (error) {
      toast.error("순서 변경에 실패했습니다.");
      // 실패 시 원래 상태로 복원
      setLocalChecklists(template.checklistTemplates || []);
    }
  };

  // 체크리스트 추가
  const handleAddChecklist = async () => {
    if (!newChecklistName.trim()) return;

    setIsAddingChecklist(true);
    try {
      const res = await fetch(`/api/super/templates/${template.id}/checklists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newChecklistName.trim() }),
      });

      if (!res.ok) throw new Error("Failed to add checklist");

      setNewChecklistName("");
      onChecklistChange();
      toast.success("체크리스트가 추가되었습니다.");
    } catch (error) {
      toast.error("체크리스트 추가에 실패했습니다.");
    } finally {
      setIsAddingChecklist(false);
    }
  };

  // 체크리스트 수정
  const handleEditChecklist = async (checklistId: string) => {
    if (!editingChecklistName.trim()) return;

    try {
      const res = await fetch(`/api/super/templates/${template.id}/checklists`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklistId,
          name: editingChecklistName.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to update checklist");

      setEditingChecklistId(null);
      onChecklistChange();
      toast.success("수정되었습니다.");
    } catch (error) {
      toast.error("수정에 실패했습니다.");
    }
  };

  // 체크리스트 삭제
  const handleDeleteChecklist = async (checklistId: string) => {
    try {
      const res = await fetch(
        `/api/super/templates/${template.id}/checklists?checklistId=${checklistId}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Failed to delete checklist");

      onChecklistChange();
      toast.success("삭제되었습니다.");
    } catch (error) {
      toast.error("삭제에 실패했습니다.");
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded bg-background border",
        isDragging && "shadow-md ring-2 ring-primary ring-offset-1 z-50"
      )}
    >
      <div className="flex items-center gap-2 p-2">
        {/* 드래그 핸들 */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </button>

        {/* 순서 번호 */}
        <span className="text-xs text-muted-foreground w-4 text-center">
          {index + 1}
        </span>

        {/* 체크리스트 펼침/접힘 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-muted rounded"
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
        </button>

        {/* 이름 */}
        <span className="text-sm flex-1">{template.name}</span>

        {/* 체크리스트 수 */}
        {checklists.length > 0 && (
          <Badge variant="outline" className="text-xs">
            <ClipboardList className="h-3 w-3 mr-1" />
            {checklists.length}
          </Badge>
        )}

        {/* 액션 버튼 */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(template, parentId, template.id);
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(template, parentId, template.id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* 체크리스트 목록 */}
      {isExpanded && (
        <div className="border-t bg-muted/20 p-2 pl-10 space-y-1">
          {checklists.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">체크리스트 없음</p>
          ) : (
            <DndContext
              sensors={checklistSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleChecklistDragEnd}
            >
              <SortableContext
                items={checklists.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {checklists.map((cl) => (
                  <SortableChecklistTemplateItem
                    key={cl.id}
                    checklist={cl}
                    isEditing={editingChecklistId === cl.id}
                    editingName={editingChecklistName}
                    onEditingNameChange={setEditingChecklistName}
                    onStartEdit={() => {
                      setEditingChecklistId(cl.id);
                      setEditingChecklistName(cl.name);
                    }}
                    onSaveEdit={() => handleEditChecklist(cl.id)}
                    onCancelEdit={() => setEditingChecklistId(null)}
                    onDelete={() => handleDeleteChecklist(cl.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}

          {/* 새 체크리스트 추가 */}
          <div className="flex items-center gap-2 pt-1">
            <Input
              value={newChecklistName}
              onChange={(e) => setNewChecklistName(e.target.value)}
              placeholder="새 체크리스트 추가"
              className="h-6 text-xs flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddChecklist();
              }}
              disabled={isAddingChecklist}
            />
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={handleAddChecklist}
              disabled={!newChecklistName.trim() || isAddingChecklist}
            >
              {isAddingChecklist ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// 체크리스트 템플릿 Sortable 컴포넌트
interface SortableChecklistTemplateItemProps {
  checklist: ChecklistTemplate;
  isEditing: boolean;
  editingName: string;
  onEditingNameChange: (name: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}

function SortableChecklistTemplateItem({
  checklist,
  isEditing,
  editingName,
  onEditingNameChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: SortableChecklistTemplateItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: checklist.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // 이벤트 전파 방지 헬퍼
  const stopPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 group bg-background",
        isDragging && "opacity-50 shadow-md z-50"
      )}
    >
      {/* 드래그 핸들 */}
      <div
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" />
      </div>

      {isEditing ? (
        <>
          <Input
            value={editingName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            className="h-6 text-xs flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
            onPointerDown={stopPropagation}
            onMouseDown={stopPropagation}
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onSaveEdit}
            onPointerDown={stopPropagation}
          >
            <Check className="h-3 w-3 text-green-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onCancelEdit}
            onPointerDown={stopPropagation}
          >
            <X className="h-3 w-3" />
          </Button>
        </>
      ) : (
        <>
          <span className="text-xs flex-1">{checklist.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100"
            onClick={onStartEdit}
            onPointerDown={stopPropagation}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive"
            onClick={onDelete}
            onPointerDown={stopPropagation}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  );
}
