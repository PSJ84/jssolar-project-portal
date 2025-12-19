"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, ExternalLink, FileText, Calendar, User } from "lucide-react";

interface Version {
  id: string;
  versionNumber: number;
  fileName: string;
  fileUrl: string;
  note: string | null;
  createdAt: string;
  uploadedBy: {
    name: string | null;
  };
  isCurrent: boolean;
}

interface ClientDocumentHistoryProps {
  documentId: string;
  documentTitle: string;
}

export function ClientDocumentHistory({
  documentId,
  documentTitle,
}: ClientDocumentHistoryProps) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchVersions();
    }
  }, [open]);

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
        setError("버전 목록을 불러오는데 실패했습니다.");
      }
    } catch (err) {
      console.error("Fetch versions error:", err);
      setError("버전 목록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <History className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>버전 히스토리</DialogTitle>
          <DialogDescription>{documentTitle}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            로딩 중...
          </div>
        ) : error ? (
          <div className="py-8 text-center text-red-500">{error}</div>
        ) : versions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            버전 기록이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`p-4 rounded-lg border ${
                  version.isCurrent ? "bg-primary/5 border-primary/20" : "bg-muted/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">v{version.versionNumber}</span>
                      {version.isCurrent && (
                        <Badge variant="secondary" className="text-xs">
                          현재 버전
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      <span className="truncate">{version.fileName}</span>
                    </div>
                    {version.note && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        "{version.note}"
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(version.createdAt).toLocaleDateString("ko-KR")}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {version.uploadedBy?.name || "알 수 없음"}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={version.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
