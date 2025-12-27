"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Upload, HardDrive, Loader2 } from "lucide-react";
import { DocumentCategory } from "@/types";
import { useGoogleDrivePicker, GooglePickerDoc } from "@/hooks/useGoogleDrivePicker";

const categoryLabels: Record<DocumentCategory, string> = {
  CONTRACT: "계약서",
  PERMIT: "인허가",
  DRAWING: "도면",
  SCHEDULE: "공정표",
  SITE_PHOTO: "현장사진",
  COMPLETION: "준공도서",
  OTHER: "기타",
};

// Category display order
const CATEGORY_ORDER: DocumentCategory[] = [
  "CONTRACT",
  "PERMIT",
  "DRAWING",
  "SCHEDULE",
  "SITE_PHOTO",
  "COMPLETION",
  "OTHER",
];

interface DocumentAddDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCustomCategories?: string[];
  isAdmin?: boolean;
}

export function DocumentAddDialog({
  projectId,
  open,
  onOpenChange,
  existingCustomCategories = [],
  isAdmin = false,
}: DocumentAddDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: "" as DocumentCategory | "",
    customCategory: "",
    description: "",
    fileUrl: "",
    fileName: "",
    note: "",
  });
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [pendingDocs, setPendingDocs] = useState<GooglePickerDoc[]>([]);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);

  // Handle Google Drive file selection
  const handleDriveSelect = useCallback((docs: GooglePickerDoc[]) => {
    if (docs.length === 0) return;

    if (docs.length === 1) {
      // Single file: fill in the form
      const doc = docs[0];
      setFormData((prev) => ({
        ...prev,
        title: prev.title || doc.name.replace(/\.[^/.]+$/, ""), // Remove extension for title
        fileUrl: doc.url,
        fileName: doc.name,
      }));
    } else {
      // Multiple files: queue them and process one by one
      setPendingDocs(docs);
      setCurrentDocIndex(0);
      const firstDoc = docs[0];
      setFormData((prev) => ({
        ...prev,
        title: firstDoc.name.replace(/\.[^/.]+$/, ""),
        fileUrl: firstDoc.url,
        fileName: firstDoc.name,
      }));
    }
  }, []);

  const { openPicker, isLoading: isPickerLoading, isReady: isPickerReady, error: pickerError } =
    useGoogleDrivePicker({
      onSelect: handleDriveSelect,
      multiSelect: true,
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.category || !formData.fileUrl || !formData.fileName) {
      alert("필수 항목을 모두 입력해주세요.");
      return;
    }

    // Validate custom category when category is OTHER
    if (formData.category === "OTHER" && showNewCategoryInput && !formData.customCategory.trim()) {
      alert("새 카테고리 이름을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          category: formData.category,
          customCategory: formData.category === "OTHER" ? formData.customCategory.trim() || null : null,
          description: formData.description || null,
          fileUrl: formData.fileUrl,
          fileName: formData.fileName,
          note: formData.note || null,
        }),
      });

      if (response.ok) {
        // Check if there are more pending docs
        if (pendingDocs.length > 0 && currentDocIndex < pendingDocs.length - 1) {
          const nextIndex = currentDocIndex + 1;
          const nextDoc = pendingDocs[nextIndex];
          setCurrentDocIndex(nextIndex);
          setFormData({
            title: nextDoc.name.replace(/\.[^/.]+$/, ""),
            category: formData.category, // Keep the same category
            customCategory: formData.customCategory,
            description: "",
            fileUrl: nextDoc.url,
            fileName: nextDoc.name,
            note: "",
          });
          router.refresh();
        } else {
          // All done, reset everything
          setFormData({
            title: "",
            category: "",
            customCategory: "",
            description: "",
            fileUrl: "",
            fileName: "",
            note: "",
          });
          setShowNewCategoryInput(false);
          setPendingDocs([]);
          setCurrentDocIndex(0);
          onOpenChange(false);
          router.refresh();
        }
      } else {
        const error = await response.json();
        alert(error.message || "문서 추가에 실패했습니다.");
      }
    } catch (error) {
      console.error("Add document error:", error);
      alert("문서 추가 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            문서 추가
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              제목 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="문서 제목을 입력하세요"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">
              카테고리 <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.category === "OTHER" && formData.customCategory && !showNewCategoryInput
                ? `CUSTOM:${formData.customCategory}`
                : formData.category}
              onValueChange={(value) => {
                if (value === "NEW_CUSTOM") {
                  setFormData({ ...formData, category: "OTHER", customCategory: "" });
                  setShowNewCategoryInput(true);
                } else if (value.startsWith("CUSTOM:")) {
                  const customCat = value.replace("CUSTOM:", "");
                  setFormData({ ...formData, category: "OTHER", customCategory: customCat });
                  setShowNewCategoryInput(false);
                } else {
                  setFormData({ ...formData, category: value as DocumentCategory, customCategory: "" });
                  setShowNewCategoryInput(false);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_ORDER.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {categoryLabels[cat]}
                  </SelectItem>
                ))}
                {existingCustomCategories.length > 0 && (
                  <>
                    <SelectItem value="---separator---" disabled className="text-muted-foreground text-xs">
                      ── 커스텀 카테고리 ──
                    </SelectItem>
                    {existingCustomCategories.map((customCat) => (
                      <SelectItem key={`CUSTOM:${customCat}`} value={`CUSTOM:${customCat}`}>
                        {customCat}
                      </SelectItem>
                    ))}
                  </>
                )}
                <SelectItem value="NEW_CUSTOM" className="text-primary font-medium">
                  + 새 카테고리 추가
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showNewCategoryInput && (
            <div className="space-y-2">
              <Label htmlFor="customCategory">
                새 카테고리 이름 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customCategory"
                value={formData.customCategory}
                onChange={(e) =>
                  setFormData({ ...formData, customCategory: e.target.value })
                }
                placeholder="예: 구조검토서"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="문서에 대한 설명을 입력하세요 (선택)"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="fileUrl">
                파일 URL <span className="text-destructive">*</span>
              </Label>
              {pendingDocs.length > 1 && (
                <span className="text-xs text-muted-foreground">
                  {currentDocIndex + 1} / {pendingDocs.length} 파일
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                id="fileUrl"
                type="url"
                value={formData.fileUrl}
                onChange={(e) =>
                  setFormData({ ...formData, fileUrl: e.target.value })
                }
                placeholder="Google Drive 또는 OneDrive 링크"
                required
                className="flex-1"
              />
              {isAdmin && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={openPicker}
                  disabled={!isPickerReady || isPickerLoading}
                  className="shrink-0"
                >
                  {isPickerLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <HardDrive className="h-4 w-4" />
                  )}
                  <span className="ml-1 hidden sm:inline">Drive</span>
                </Button>
              )}
            </div>
            {pickerError && (
              <p className="text-xs text-destructive">{pickerError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fileName">
              파일명 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fileName"
              value={formData.fileName}
              onChange={(e) =>
                setFormData({ ...formData, fileName: e.target.value })
              }
              placeholder="파일명.pdf"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">메모</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) =>
                setFormData({ ...formData, note: e.target.value })
              }
              placeholder="버전에 대한 메모 (선택)"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "처리중..." : "추가"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
