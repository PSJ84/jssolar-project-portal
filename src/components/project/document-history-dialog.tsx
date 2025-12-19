"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, FileText, ExternalLink, User, Calendar } from "lucide-react";
import { DocumentVersion } from "@/types";

interface DocumentHistoryDialogProps {
  documentId: string;
  documentTitle: string;
  currentVersionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentHistoryDialog({
  documentId,
  documentTitle,
  currentVersionId,
  open,
  onOpenChange,
}: DocumentHistoryDialogProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && documentId) {
      fetchVersions();
    }
  }, [open, documentId]);

  const fetchVersions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}/versions`);
      if (response.ok) {
        const data = await response.json();
        // API returns { documentId, documentTitle, versions: [...] }
        const versionList = Array.isArray(data) ? data : (data.versions || []);
        setVersions(versionList);
      } else {
        setError("버전 히스토리를 불러오는데 실패했습니다.");
      }
    } catch (err) {
      console.error("Fetch versions error:", err);
      setError("버전 히스토리를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            버전 히스토리
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 pt-2">
            <FileText className="h-4 w-4" />
            {documentTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-destructive">{error}</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">버전 히스토리가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => {
                const isCurrent = version.id === currentVersionId;
                return (
                  <div
                    key={version.id}
                    className={`p-4 rounded-lg border ${
                      isCurrent
                        ? "border-primary bg-primary/5"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">
                            v{version.versionNumber}
                          </span>
                          {isCurrent && (
                            <Badge variant="default" className="text-xs">
                              현재 버전
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate mb-2">
                          {version.fileName}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {version.uploadedBy?.name ||
                              version.uploadedBy?.email ||
                              "알 수 없음"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(version.createdAt)}
                          </span>
                        </div>
                        {version.note && (
                          <p className="mt-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                            {version.note}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="flex-shrink-0"
                      >
                        <a
                          href={version.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          열기
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
