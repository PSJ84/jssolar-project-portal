"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDday } from "@/lib/date-utils";

interface AlertTask {
  id: string;
  name: string;
  dueDate: string;
  projectId: string;
  projectName: string;
}

interface ProjectAlertTasksProps {
  tasks: AlertTask[];
}

export function ProjectAlertTasks({ tasks }: ProjectAlertTasksProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 기한 초과 태스크 수
  const overdueCount = tasks.filter((t) => {
    const dueDate = new Date(t.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  }).length;

  return (
    <Card className={cn(overdueCount > 0 && "border-red-200")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className={cn("h-5 w-5", overdueCount > 0 ? "text-red-500" : "text-yellow-500")} />
            기한 임박/초과 태스크
            <Badge variant={overdueCount > 0 ? "destructive" : "secondary"} className="ml-2">
              {tasks.length}건
            </Badge>
            {overdueCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                초과 {overdueCount}건
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {tasks.map((task) => {
              const dday = getDday(task.dueDate);
              const dueDate = new Date(task.dueDate);
              dueDate.setHours(0, 0, 0, 0);
              const isOverdue = dueDate < today;

              return (
                <Link
                  key={task.id}
                  href={`/admin/projects/${task.projectId}`}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors",
                    isOverdue && "bg-red-50 hover:bg-red-100"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isOverdue && "text-red-700"
                    )}>
                      {task.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{task.projectName}</p>
                  </div>
                  {dday && (
                    <Badge
                      variant={dday.variant}
                      className={cn(
                        "text-xs ml-2 shrink-0",
                        isOverdue && "bg-red-500 text-white hover:bg-red-600"
                      )}
                    >
                      {dday.label}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
