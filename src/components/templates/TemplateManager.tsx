"use client";

import { useState } from "react";
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
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  GripVertical,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  sortOrder: number;
  isPermitTask: boolean;
  processingDays: number | null;
  children: Template[];
}

interface TemplateManagerProps {
  initialTemplates: Template[];
}

export function TemplateManager({ initialTemplates }: TemplateManagerProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 메인 템플릿 순서 변경
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

  // 하위 템플릿 순서 변경
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

  // 펼침/접힘 토글
  const toggleExpanded = (id: string) => {
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>시스템 템플릿 관리</CardTitle>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              단계 추가
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            드래그하여 순서를 변경할 수 있습니다
          </p>
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
                    onToggleExpand={() => toggleExpanded(template.id)}
                    onChildDragEnd={(e) => handleChildDragEnd(template.id, e)}
                    sensors={sensors}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      {/* 저장 중 인디케이터 */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <Loader2 className="h-4 w-4 animate-spin" />
          저장 중...
        </div>
      )}
    </div>
  );
}

// 메인 템플릿 Sortable 컴포넌트
interface SortableMainTemplateProps {
  template: Template;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onChildDragEnd: (event: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
}

function SortableMainTemplate({
  template,
  index,
  isExpanded,
  onToggleExpand,
  onChildDragEnd,
  sensors,
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
        <div className="flex items-center gap-2 p-3">
          {/* 드래그 핸들 */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* 순서 번호 */}
          <span className="text-sm text-muted-foreground w-6 text-center">
            {index + 1}
          </span>

          {/* 펼침/접힘 (하위 태스크 있을 때만) */}
          {template.children.length > 0 && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
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
          <span className="font-medium flex-1">{template.name}</span>

          {/* 인허가 배지 */}
          {template.isPermitTask && (
            <Badge variant="outline" className="text-blue-600 border-blue-200">
              <FileCheck className="h-3 w-3 mr-1" />
              인허가 {template.processingDays}일
            </Badge>
          )}

          {/* 하위 태스크 수 */}
          {template.children.length > 0 && (
            <Badge variant="secondary">하위 {template.children.length}</Badge>
          )}

          {/* 액션 버튼 */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
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
  template: Template;
  index: number;
}

function SortableChildTemplate({
  template,
  index,
}: SortableChildTemplateProps) {
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
        "flex items-center gap-2 p-2 rounded bg-background border",
        isDragging && "shadow-md ring-2 ring-primary ring-offset-1 z-50"
      )}
    >
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

      {/* 이름 */}
      <span className="text-sm flex-1">{template.name}</span>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
