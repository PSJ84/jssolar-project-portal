"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  content: string;
  isChecked: boolean;
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
}

interface TaskDetailModalProps {
  projectId: string;
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  isAdmin: boolean;
  hasTaskDetailFeature: boolean;
}

export function TaskDetailModal({
  projectId,
  taskId,
  isOpen,
  onClose,
  onUpdate,
  isAdmin,
  hasTaskDetailFeature,
}: TaskDetailModalProps) {
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
      if (!res.ok) throw new Error("Failed to fetch assignees");
      const data = await res.json();
      setAssignees(data);
    } catch (error) {
      console.error(error);
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
          dueDate: dueDate?.toISOString() || null,
          completedDate: completedDate?.toISOString() || null,
          memo: memo.trim() || null,
          assigneeId: assigneeId || null,
          version: task.version,
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

  // Toggle checklist item
  const handleToggleChecklist = async (item: ChecklistItem) => {
    if (!task) return;

    try {
      const res = await fetch(
        `/api/projects/${projectId}/tasks-v2/${taskId}/checklists`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checklistId: item.id,
            isChecked: !item.isChecked,
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
      toast.error("업데이트에 실패했습니다.");
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {task?.parent && (
              <span className="text-muted-foreground font-normal">
                {task.parent.name} &gt;
              </span>
            )}
            {task?.name || "태스크 상세"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !task ? (
          <p className="text-center text-muted-foreground py-8">
            태스크를 찾을 수 없습니다.
          </p>
        ) : (
          <div className="space-y-6">
            {/* 날짜 섹션 */}
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
                    {task.checklists.filter((c) => c.isChecked).length}/
                    {task.checklists.length} 완료
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
                  <div className="space-y-2">
                    {task.checklists.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md border",
                          item.isChecked && "bg-muted/50"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => isAdmin && handleToggleChecklist(item)}
                          disabled={!isAdmin}
                          className="shrink-0"
                        >
                          {item.isChecked ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>
                        <span
                          className={cn(
                            "flex-1 text-sm",
                            item.isChecked && "line-through text-muted-foreground"
                          )}
                        >
                          {item.content}
                        </span>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteChecklist(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

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
      </DialogContent>
    </Dialog>
  );
}
