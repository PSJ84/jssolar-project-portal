"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  Trash2,
  Lock,
  FileCheck,
  Clock,
  Send,
  FileInput,
  Search,
  AlertTriangle,
  CheckCircle2,
  Download,
  GripVertical,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// 체크리스트 상태 정의
type ChecklistStatus =
  | "PENDING"
  | "REQUESTED"
  | "RECEIVED"
  | "REVIEWING"
  | "REVISION"
  | "COMPLETED";

const CHECKLIST_STATUS_CONFIG: Record<
  ChecklistStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: "대기",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    icon: <Clock className="h-3 w-3" />,
  },
  REQUESTED: {
    label: "요청함",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: <Send className="h-3 w-3" />,
  },
  RECEIVED: {
    label: "수령완료",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: <FileInput className="h-3 w-3" />,
  },
  REVIEWING: {
    label: "검토중",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Search className="h-3 w-3" />,
  },
  REVISION: {
    label: "보완필요",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  COMPLETED: {
    label: "완료",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
};

interface ChecklistItem {
  id: string;
  content: string;
  status: ChecklistStatus;
  sortOrder: number;
}

interface Assignee {
  id: string;
  name: string | null;
  email: string;
}

interface TaskDetail {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  dueDate: string | null;
  completedDate: string | null;
  memo: string | null;
  alertEnabled: boolean;
  assignee: Assignee | null;
  assigneeId: string | null;
  version: number;
  parent: { id: string; name: string } | null;
  checklists: ChecklistItem[];
  // 인허가 필드
  isPermitTask: boolean;
  processingDays: number | null;
  submittedDate: string | null;
}

interface TaskDetailSheetProps {
  projectId: string;
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  isAdmin: boolean;
  hasTaskDetailFeature: boolean;
}

// Sortable Checklist Item Component
interface SortableChecklistItemProps {
  item: ChecklistItem;
  isAdmin: boolean;
  onStatusChange: (item: ChecklistItem, newStatus: ChecklistStatus) => void;
  onDelete: (checklistId: string) => void;
}

function SortableChecklistItem({
  item,
  isAdmin,
  onStatusChange,
  onDelete,
}: SortableChecklistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusConfig = CHECKLIST_STATUS_CONFIG[item.status];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 rounded-md border bg-background",
        item.status === "COMPLETED" && "bg-muted/50",
        isDragging && "opacity-50 shadow-lg z-50"
      )}
    >
      {/* 드래그 핸들 (Admin만) */}
      {isAdmin && (
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      {/* 상태 드롭다운 */}
      <div onPointerDown={(e) => e.stopPropagation()}>
        <Select
          value={item.status}
          onValueChange={(value) => {
            if (isAdmin) {
              onStatusChange(item, value as ChecklistStatus);
            }
          }}
          disabled={!isAdmin}
        >
          <SelectTrigger className="w-[120px] h-8">
          <Badge
            variant="outline"
            className={cn(
              "flex items-center gap-1 font-normal",
              statusConfig.color
            )}
          >
            {statusConfig.icon}
            {statusConfig.label}
          </Badge>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(CHECKLIST_STATUS_CONFIG).map(([status, config]) => (
            <SelectItem key={status} value={status}>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "flex items-center gap-1 font-normal",
                    config.color
                  )}
                >
                  {config.icon}
                  {config.label}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
        </Select>
      </div>

      {/* 내용 */}
      <span
        className={cn(
          "flex-1 text-sm",
          item.status === "COMPLETED" && "line-through text-muted-foreground"
        )}
      >
        {item.content}
      </span>

      {/* 삭제 버튼 */}
      {isAdmin && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(item.id)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function TaskDetailSheet({
  projectId,
  taskId,
  isOpen,
  onClose,
  onUpdate,
  isAdmin,
  hasTaskDetailFeature,
}: TaskDetailSheetProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);

  // Form states
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [completedDate, setCompletedDate] = useState<Date | undefined>();
  const [memo, setMemo] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [newChecklistContent, setNewChecklistContent] = useState("");
  const [importingTemplate, setImportingTemplate] = useState(false);

  // 인허가 상태
  const [submittedDate, setSubmittedDate] = useState<Date | undefined>();
  const [processingDays, setProcessingDays] = useState<number | null>(null);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch task detail
  const fetchTask = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}/tasks-v2/${taskId}`);
      if (!res.ok) throw new Error("Failed to fetch task");
      const data: TaskDetail = await res.json();
      setTask(data);

      // Initialize form states
      setStartDate(data.startDate ? new Date(data.startDate) : undefined);
      setDueDate(data.dueDate ? new Date(data.dueDate) : undefined);
      setCompletedDate(data.completedDate ? new Date(data.completedDate) : undefined);
      setMemo(data.memo || "");
      setAssigneeId(data.assigneeId || "");

      // 인허가 필드 초기화
      setSubmittedDate(data.submittedDate ? new Date(data.submittedDate) : undefined);
      setProcessingDays(data.processingDays);
    } catch (error) {
      console.error(error);
      toast.error("태스크 정보를 불러오는데 실패했습니다.");
      onClose();
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId, onClose]);

  // Fetch assignees (ADMIN users in project's organization)
  const fetchAssignees = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/assignees?projectId=${projectId}`);
      if (!res.ok) {
        const error = await res.json();
        console.error("Assignees error:", error);
        return;
      }
      const data = await res.json();
      setAssignees(data);
    } catch (error) {
      console.error("Fetch assignees failed:", error);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTask();
      if (isAdmin) {
        fetchAssignees();
      }
    }
  }, [isOpen, taskId, fetchTask, fetchAssignees, isAdmin]);

  // Save task
  const handleSave = async () => {
    if (!task) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks-v2/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: startDate?.toISOString() || null,
          dueDate: task.isPermitTask ? undefined : (dueDate?.toISOString() || null),
          completedDate: completedDate?.toISOString() || null,
          memo: memo.trim() || null,
          assigneeId: assigneeId || null,
          version: task.version,
          submittedDate: submittedDate?.toISOString() || null,
          processingDays: processingDays,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save");
      }

      toast.success("저장되었습니다.");
      onUpdate();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // Add checklist item
  const handleAddChecklist = async () => {
    if (!newChecklistContent.trim() || !task) return;

    try {
      const res = await fetch(
        `/api/projects/${projectId}/tasks-v2/${taskId}/checklists`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newChecklistContent.trim() }),
        }
      );

      if (!res.ok) throw new Error("Failed to add checklist");

      const newItem: ChecklistItem = await res.json();
      setTask((prev) =>
        prev ? { ...prev, checklists: [...prev.checklists, newItem] } : prev
      );
      setNewChecklistContent("");
      toast.success("체크리스트 항목이 추가되었습니다.");
    } catch (error) {
      console.error(error);
      toast.error("추가에 실패했습니다.");
    }
  };

  // Update checklist status
  const handleStatusChange = async (item: ChecklistItem, newStatus: ChecklistStatus) => {
    if (!task) return;

    try {
      const res = await fetch(
        `/api/projects/${projectId}/tasks-v2/${taskId}/checklists`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checklistId: item.id,
            status: newStatus,
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to update checklist");

      const updated: ChecklistItem = await res.json();
      setTask((prev) =>
        prev
          ? {
              ...prev,
              checklists: prev.checklists.map((cl) =>
                cl.id === item.id ? updated : cl
              ),
            }
          : prev
      );
    } catch (error) {
      console.error(error);
      toast.error("상태 변경에 실패했습니다.");
    }
  };

  // Delete checklist item
  const handleDeleteChecklist = async (checklistId: string) => {
    if (!task) return;

    try {
      const res = await fetch(
        `/api/projects/${projectId}/tasks-v2/${taskId}/checklists?checklistId=${checklistId}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Failed to delete checklist");

      setTask((prev) =>
        prev
          ? {
              ...prev,
              checklists: prev.checklists.filter((cl) => cl.id !== checklistId),
            }
          : prev
      );
      toast.success("삭제되었습니다.");
    } catch (error) {
      console.error(error);
      toast.error("삭제에 실패했습니다.");
    }
  };

  // 템플릿에서 체크리스트 가져오기
  const handleImportFromTemplate = async () => {
    if (!task) return;

    setImportingTemplate(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/tasks-v2/${taskId}/checklists/import-template`,
        { method: "POST" }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to import");
      }

      const data = await res.json();

      if (data.addedCount > 0) {
        // 새로 추가된 체크리스트를 목록에 추가
        setTask((prev) =>
          prev
            ? {
                ...prev,
                checklists: [...prev.checklists, ...data.checklists],
              }
            : prev
        );
        toast.success(`${data.addedCount}개 항목을 가져왔습니다.`);
      } else if (data.skippedCount > 0) {
        toast.info("모든 항목이 이미 존재합니다.");
      } else {
        toast.info("가져올 항목이 없습니다.");
      }
    } catch (error) {
      console.error(error);
      if (error instanceof Error && error.message.includes("No matching template")) {
        toast.error("연결된 템플릿이 없습니다.");
      } else if (error instanceof Error && error.message.includes("no checklists")) {
        toast.error("템플릿에 체크리스트가 없습니다.");
      } else {
        toast.error("가져오기에 실패했습니다.");
      }
    } finally {
      setImportingTemplate(false);
    }
  };

  // Handle drag end for checklist reorder
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !task) return;

    const oldIndex = task.checklists.findIndex((c) => c.id === active.id);
    const newIndex = task.checklists.findIndex((c) => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // 로컬 상태 먼저 업데이트 (낙관적 업데이트)
    const reorderedChecklists = arrayMove(task.checklists, oldIndex, newIndex);
    setTask((prev) =>
      prev ? { ...prev, checklists: reorderedChecklists } : prev
    );

    // API 호출
    try {
      const orderedIds = reorderedChecklists.map((c) => c.id);
      const res = await fetch(
        `/api/projects/${projectId}/tasks-v2/${taskId}/checklists/reorder`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds }),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to reorder");
      }
    } catch (error) {
      console.error(error);
      toast.error("순서 변경에 실패했습니다.");
      // 실패 시 원래 상태로 복원
      fetchTask();
    }
  };

  // 완료된 체크리스트 개수 계산
  const completedCount = task?.checklists.filter(
    (c) => c.status === "COMPLETED"
  ).length ?? 0;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto px-6">
        <SheetHeader>
          <SheetTitle className="flex flex-col gap-1 text-left">
            {task?.parent && (
              <span className="text-muted-foreground font-normal text-sm">
                {task.parent.name}
              </span>
            )}
            <span className="truncate">{task?.name || "태스크 상세"}</span>
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !task ? (
          <p className="text-center text-muted-foreground py-8">
            태스크를 찾을 수 없습니다.
          </p>
        ) : (
          <div className="space-y-5 mt-4 pb-4">
            {/* 인허가 단계인 경우 */}
            {task.isPermitTask ? (
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileCheck className="h-4 w-4" />
                  인허가 단계
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="isSubmitted"
                    checked={!!submittedDate}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSubmittedDate(new Date());
                      } else {
                        setSubmittedDate(undefined);
                      }
                    }}
                    disabled={!isAdmin}
                  />
                  <Label htmlFor="isSubmitted" className="cursor-pointer">
                    접수완료
                  </Label>
                </div>

                {submittedDate && (
                  <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>접수일</Label>
                        <DatePicker
                          value={submittedDate}
                          onChange={setSubmittedDate}
                          placeholder="접수일 선택"
                          disabled={!isAdmin}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>처리기한 (일)</Label>
                        <Input
                          type="number"
                          value={processingDays ?? ""}
                          onChange={(e) => setProcessingDays(e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="14"
                          min={1}
                          disabled={!isAdmin}
                        />
                      </div>
                    </div>

                    {/* 완료예정일 - 자동 계산 */}
                    <div className="space-y-2">
                      <Label>완료예정일</Label>
                      <div className="text-sm p-2 bg-background rounded border">
                        {submittedDate && processingDays ? (
                          <>
                            {(() => {
                              const calcDate = new Date(submittedDate);
                              calcDate.setDate(calcDate.getDate() + processingDays);
                              return calcDate.toLocaleDateString("ko-KR", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              });
                            })()}
                            <span className="text-muted-foreground ml-2">(자동 계산)</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">접수일과 처리기한을 입력하세요</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <Label>완료일</Label>
                  <DatePicker
                    value={completedDate}
                    onChange={setCompletedDate}
                    placeholder="완료일 선택"
                    disabled={!isAdmin}
                  />
                </div>
              </div>
            ) : (
              /* 일반 단계 */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>시작일</Label>
                    <DatePicker
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="시작일 선택"
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>마감일</Label>
                    <DatePicker
                      value={dueDate}
                      onChange={setDueDate}
                      placeholder="마감일 선택"
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>완료일</Label>
                  <DatePicker
                    value={completedDate}
                    onChange={setCompletedDate}
                    placeholder="완료일 선택"
                    disabled={!isAdmin}
                  />
                </div>
              </div>
            )}

            {/* 담당자 */}
            {isAdmin && (
              <div className="space-y-2">
                <Label>담당자</Label>
                <Select
                  value={assigneeId || "__none__"}
                  onValueChange={(value) =>
                    setAssigneeId(value === "__none__" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="담당자 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">없음</SelectItem>
                    {assignees.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 메모 */}
            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="메모를 입력하세요"
                rows={3}
                disabled={!isAdmin}
              />
            </div>

            {/* 체크리스트 (Pro 기능) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  체크리스트
                  {!hasTaskDetailFeature && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Pro
                    </span>
                  )}
                </Label>
                {hasTaskDetailFeature && (
                  <span className="text-xs text-muted-foreground">
                    {completedCount}/{task.checklists.length} 완료
                  </span>
                )}
              </div>

              {!hasTaskDetailFeature ? (
                <div className="border rounded-lg p-4 bg-muted/30 text-center">
                  <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    체크리스트는 Pro 플랜에서 사용할 수 있습니다.
                  </p>
                </div>
              ) : (
                <>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={task.checklists.map((c) => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {task.checklists.map((item) => (
                          <SortableChecklistItem
                            key={item.id}
                            item={item}
                            isAdmin={isAdmin}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDeleteChecklist}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {isAdmin && (
                    <div className="flex gap-2">
                      <Input
                        value={newChecklistContent}
                        onChange={(e) => setNewChecklistContent(e.target.value)}
                        placeholder="새 항목 추가"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddChecklist();
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleAddChecklist}
                        disabled={!newChecklistContent.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleImportFromTemplate}
                        disabled={importingTemplate}
                        title="템플릿에서 가져오기"
                      >
                        {importingTemplate ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        <span className="ml-1 hidden sm:inline">템플릿</span>
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 액션 버튼 */}
            {isAdmin && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={onClose} disabled={saving}>
                  취소
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  저장
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
