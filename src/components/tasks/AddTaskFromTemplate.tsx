"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  sortOrder: number;
}

interface AddTaskFromTemplateProps {
  projectId: string;
  existingTemplateIds: string[];
  onSuccess: () => void;
}

export function AddTaskFromTemplate({
  projectId,
  existingTemplateIds,
  onSuccess,
}: AddTaskFromTemplateProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // 모달 열릴 때 템플릿 목록 조회
  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("Failed to fetch templates");

      const allTemplates: Template[] = await res.json();

      // 이미 추가된 템플릿 제외
      const available = allTemplates.filter(
        (t) => !existingTemplateIds.includes(t.id)
      );

      setTemplates(available);
    } catch (error) {
      console.error(error);
      toast.error("템플릿 목록을 불러오는데 실패했습니다");
    } finally {
      setFetching(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedTemplateId) {
      toast.error("템플릿을 선택해주세요");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/tasks-v2/add-from-template`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: selectedTemplateId }),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add task");
      }

      const result = await res.json();
      toast.success(`단계가 추가되었습니다 (하위 ${result.childCount}개 포함)`);
      setOpen(false);
      setSelectedTemplateId("");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "단계 추가에 실패했습니다"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          단계 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>템플릿에서 단계 추가</DialogTitle>
          <DialogDescription>
            추가할 단계를 선택하세요. 하위 단계도 함께 추가됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {fetching ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              추가 가능한 템플릿이 없습니다
            </p>
          ) : (
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
            >
              <SelectTrigger>
                <SelectValue placeholder="단계 선택..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button
            onClick={handleAdd}
            disabled={loading || !selectedTemplateId || templates.length === 0}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
