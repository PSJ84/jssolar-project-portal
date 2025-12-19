import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Check, Circle, Square, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

// Task type labels in Korean
const taskTypeLabels: Record<string, string> = {
  SITE_SURVEY: "현장실측/조사",
  BUSINESS_PERMIT: "발전사업허가",
  DEVELOPMENT_PERMIT: "개발행위허가",
  CONTRACT: "도급계약",
  STRUCTURE_DRAWING: "구조물도면/구조검토",
  ELECTRICAL_DRAWING: "전기도면",
  CONSTRUCTION_PLAN: "공사계획신고",
  PPA_APPLICATION: "PPA신청",
  PRE_USE_INSPECTION: "사용전검사",
  DEVELOPMENT_COMPLETION: "개발행위준공",
  BUSINESS_START: "사업개시신고",
  FACILITY_CONFIRM: "설비확인",
};

// Task status labels in Korean
const taskStatusLabels: Record<string, string> = {
  NOT_STARTED: "대기",
  IN_PROGRESS: "진행중",
  SUBMITTED: "접수",
  COMPLETED: "완료",
};

interface Task {
  id: string;
  taskType: string;
  status: string;
  displayOrder: number;
  note: string | null;
  completedAt: string | null;
}

interface TaskListProps {
  tasks: Task[];
}

export function TaskList({ tasks }: TaskListProps) {
  // Sort tasks by displayOrder
  const sortedTasks = [...tasks].sort((a, b) => a.displayOrder - b.displayOrder);

  // Calculate progress
  const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="h-4 w-4 text-green-600" />
          </div>
        );
      case "IN_PROGRESS":
      case "SUBMITTED":
        return (
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
            <Circle className="h-4 w-4 text-blue-600 fill-blue-600" />
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
            <Square className="h-3.5 w-3.5 text-gray-400" />
          </div>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      NOT_STARTED: "bg-gray-100 text-gray-600 hover:bg-gray-100",
      IN_PROGRESS: "bg-blue-100 text-blue-700 hover:bg-blue-100",
      SUBMITTED: "bg-amber-100 text-amber-700 hover:bg-amber-100",
      COMPLETED: "bg-green-100 text-green-700 hover:bg-green-100",
    };

    return (
      <Badge variant="secondary" className={cn("text-xs font-medium", colors[status])}>
        {taskStatusLabels[status] || status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">진행 현황</CardTitle>
          <Badge variant="outline" className="text-sm">
            {completedCount} / {tasks.length} 완료
          </Badge>
        </div>
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">전체 진행률</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {sortedTasks.map((task, index) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                task.status === "COMPLETED"
                  ? "bg-green-50/50"
                  : task.status === "IN_PROGRESS" || task.status === "SUBMITTED"
                  ? "bg-blue-50/50"
                  : "bg-muted/30"
              )}
            >
              {/* Status Icon */}
              <div className="flex-shrink-0">{getStatusIcon(task.status)}</div>

              {/* Task Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "font-medium text-sm",
                      task.status === "COMPLETED" && "text-green-700",
                      (task.status === "IN_PROGRESS" || task.status === "SUBMITTED") &&
                        "text-blue-700",
                      task.status === "NOT_STARTED" && "text-muted-foreground"
                    )}
                  >
                    {taskTypeLabels[task.taskType] || task.taskType}
                  </span>
                  {/* Status Badge - visible on mobile */}
                  <span className="md:hidden">{getStatusBadge(task.status)}</span>
                </div>
                {task.completedAt && (
                  <div className="flex items-center gap-1 text-xs text-green-600 mt-0.5">
                    <Calendar className="h-3 w-3" />
                    {new Date(task.completedAt).toLocaleDateString("ko-KR")} 완료
                  </div>
                )}
              </div>

              {/* Status Badge - hidden on mobile */}
              <div className="hidden md:block flex-shrink-0">
                {getStatusBadge(task.status)}
              </div>
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              등록된 작업이 없습니다.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
