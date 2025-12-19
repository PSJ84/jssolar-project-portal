"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText } from "lucide-react";

interface DocumentVersionDialogProps {
  documentId: string;
  documentTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentVersionDialog({
  documentId,
  documentTitle,
  open,
  onOpenChange,
}: DocumentVersionDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fileUrl: "",
    fileName: "",
    note: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fileUrl || !formData.fileName) {
      alert("필수 항목을 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl: formData.fileUrl,
          fileName: formData.fileName,
          note: formData.note || null,
        }),
      });

      if (response.ok) {
        setFormData({
          fileUrl: "",
          fileName: "",
          note: "",
        });
        onOpenChange(false);
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.message || "버전 추가에 실패했습니다.");
      }
    } catch (error) {
      console.error("Add version error:", error);
      alert("버전 추가 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            새 버전 추가
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 pt-2">
            <FileText className="h-4 w-4" />
            {documentTitle}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fileUrl">
              파일 URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fileUrl"
              type="url"
              value={formData.fileUrl}
              onChange={(e) =>
                setFormData({ ...formData, fileUrl: e.target.value })
              }
              placeholder="Google Drive 또는 OneDrive 링크"
              required
            />
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
              rows={3}
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
