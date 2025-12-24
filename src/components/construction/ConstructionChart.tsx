"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  addDays,
  differenceInDays,
  startOfWeek,
  endOfWeek,
  format,
  isWithinInterval,
  isSameDay,
  addWeeks,
  min,
  max,
} from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "lucide-react";

interface ConstructionItem {
  id: string;
  phaseId: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  progress: number;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";
  memo: string | null;
  sortOrder: number;
}

interface ConstructionPhase {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;
  items: ConstructionItem[];
}

interface ConstructionChartProps {
  phases: ConstructionPhase[];
}

const statusColors = {
  PLANNED: { bg: "bg-gray-200", text: "text-gray-700", bar: "bg-gray-400" },
  IN_PROGRESS: { bg: "bg-blue-100", text: "text-blue-700", bar: "bg-blue-500" },
  COMPLETED: { bg: "bg-green-100", text: "text-green-700", bar: "bg-green-500" },
  DELAYED: { bg: "bg-red-100", text: "text-red-700", bar: "bg-red-500" },
};

export function ConstructionChart({ phases }: ConstructionChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolledToToday, setScrolledToToday] = useState(false);
  const today = new Date();

  // 전체 항목을 flat하게 만들기
  const allItems = useMemo(() => {
    const items: { phase: ConstructionPhase; item: ConstructionItem }[] = [];
    phases.forEach((phase) => {
      phase.items.forEach((item) => {
        items.push({ phase, item });
      });
    });
    return items;
  }, [phases]);

  // 전체 기간 계산
  const { chartStart, chartEnd, weeks } = useMemo(() => {
    if (allItems.length === 0) {
      const start = startOfWeek(today, { weekStartsOn: 1 });
      const end = addWeeks(start, 12);
      return {
        chartStart: start,
        chartEnd: end,
        weeks: Array.from({ length: 12 }, (_, i) => addWeeks(start, i)),
      };
    }

    const dates: Date[] = [];
    allItems.forEach(({ item }) => {
      if (item.startDate) dates.push(new Date(item.startDate));
      if (item.endDate) dates.push(new Date(item.endDate));
      if (item.actualStart) dates.push(new Date(item.actualStart));
      if (item.actualEnd) dates.push(new Date(item.actualEnd));
    });

    if (dates.length === 0) {
      const start = startOfWeek(today, { weekStartsOn: 1 });
      const end = addWeeks(start, 12);
      return {
        chartStart: start,
        chartEnd: end,
        weeks: Array.from({ length: 12 }, (_, i) => addWeeks(start, i)),
      };
    }

    dates.push(today);
    const minDate = min(dates);
    const maxDate = max(dates);

    const start = startOfWeek(addDays(minDate, -7), { weekStartsOn: 1 });
    const end = endOfWeek(addDays(maxDate, 14), { weekStartsOn: 1 });

    const weekCount = Math.ceil(differenceInDays(end, start) / 7);
    const weekArray = Array.from({ length: weekCount }, (_, i) =>
      addWeeks(start, i)
    );

    return {
      chartStart: start,
      chartEnd: end,
      weeks: weekArray,
    };
  }, [allItems, today]);

  const totalDays = differenceInDays(chartEnd, chartStart) + 1;
  const dayWidth = 20; // px per day
  const chartWidth = totalDays * dayWidth;

  // 오늘 위치로 스크롤
  useEffect(() => {
    if (scrollRef.current && !scrolledToToday) {
      const todayOffset = differenceInDays(today, chartStart) * dayWidth;
      const containerWidth = scrollRef.current.clientWidth;
      scrollRef.current.scrollLeft = Math.max(0, todayOffset - containerWidth / 2);
      setScrolledToToday(true);
    }
  }, [chartStart, scrolledToToday, today]);

  const getBarPosition = (start: Date, end: Date) => {
    const startOffset = differenceInDays(start, chartStart);
    const duration = differenceInDays(end, start) + 1;
    return {
      left: startOffset * dayWidth,
      width: Math.max(duration * dayWidth - 2, dayWidth - 2),
    };
  };

  if (phases.length === 0 || allItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>등록된 공정이 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">공정표</CardTitle>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-gray-300 opacity-50" />
              <span>계획</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span>진행중</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span>완료</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>지연</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex">
          {/* 왼쪽 라벨 영역 */}
          <div className="flex-shrink-0 w-48 border-r bg-muted/30">
            {/* 헤더 */}
            <div className="h-12 border-b flex items-center px-3 font-medium text-sm bg-muted/50">
              공정명
            </div>
            {/* 항목들 */}
            {allItems.map(({ phase, item }, index) => {
              const showPhaseLabel =
                index === 0 ||
                allItems[index - 1].phase.id !== phase.id;

              return (
                <div key={item.id}>
                  {showPhaseLabel && (
                    <div className="h-7 bg-muted/80 px-3 flex items-center text-xs font-semibold text-muted-foreground border-b">
                      {phase.name}
                    </div>
                  )}
                  <div className="h-10 px-3 flex items-center text-sm border-b truncate">
                    {item.name}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 오른쪽 차트 영역 */}
          <div className="flex-1 overflow-x-auto" ref={scrollRef}>
            <div style={{ width: chartWidth, minWidth: "100%" }}>
              {/* 헤더 - 주 단위 */}
              <div className="h-12 border-b flex bg-muted/50">
                {weeks.map((week, i) => {
                  const weekEnd = addDays(week, 6);
                  const isCurrentWeek = isWithinInterval(today, {
                    start: week,
                    end: weekEnd,
                  });

                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-shrink-0 border-r flex flex-col items-center justify-center text-xs",
                        isCurrentWeek && "bg-primary/10"
                      )}
                      style={{ width: 7 * dayWidth }}
                    >
                      <span className="font-medium">
                        {format(week, "M/d", { locale: ko })}
                      </span>
                      <span className="text-muted-foreground">
                        ~{format(weekEnd, "M/d", { locale: ko })}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* 차트 영역 */}
              <div className="relative">
                {/* 오늘 세로선 */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                  style={{
                    left: differenceInDays(today, chartStart) * dayWidth + dayWidth / 2,
                  }}
                >
                  <div className="absolute -top-5 -left-3 bg-red-500 text-white text-[10px] px-1 rounded">
                    오늘
                  </div>
                </div>

                {/* 주 단위 배경선 */}
                {weeks.map((week, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-r border-dashed border-gray-200"
                    style={{ left: (i + 1) * 7 * dayWidth }}
                  />
                ))}

                {/* 항목별 바 */}
                {allItems.map(({ phase, item }, index) => {
                  const showPhaseLabel =
                    index === 0 ||
                    allItems[index - 1].phase.id !== phase.id;

                  const hasPlanned = item.startDate && item.endDate;
                  const hasActual = item.actualStart && (item.actualEnd || item.status === "IN_PROGRESS");

                  return (
                    <div key={item.id}>
                      {showPhaseLabel && (
                        <div className="h-7 bg-muted/50 border-b" />
                      )}
                      <div className="h-10 relative border-b">
                        {/* 계획 막대 (연한색) */}
                        {hasPlanned && (
                          <div
                            className="absolute h-3 top-2 rounded-sm bg-gray-200 opacity-70"
                            style={getBarPosition(
                              new Date(item.startDate!),
                              new Date(item.endDate!)
                            )}
                          />
                        )}

                        {/* 실적 막대 (진한색) */}
                        {hasActual && (
                          <div
                            className={cn(
                              "absolute h-3 top-5 rounded-sm",
                              statusColors[item.status].bar
                            )}
                            style={getBarPosition(
                              new Date(item.actualStart!),
                              item.actualEnd
                                ? new Date(item.actualEnd)
                                : today
                            )}
                          >
                            {/* 진행률 표시 */}
                            {item.progress > 0 && item.progress < 100 && (
                              <div
                                className="absolute inset-y-0 left-0 bg-white/30 rounded-l-sm"
                                style={{ width: `${100 - item.progress}%`, right: 0, left: 'auto' }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
