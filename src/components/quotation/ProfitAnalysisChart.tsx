"use client";

import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { YearlyData } from "@/lib/profit-analysis";

interface ProfitAnalysisChartProps {
  yearlyData: YearlyData[];
}

export function ProfitAnalysisChart({ yearlyData }: ProfitAnalysisChartProps) {
  // 차트 데이터 변환 (백만원 단위)
  const chartData = yearlyData.map((d) => ({
    year: `${d.year}년`,
    yearNum: d.year,
    수익: Math.round(d.totalRevenue / 10000), // 만원 단위
    비용: Math.round(d.totalExpense / 10000),
    순이익: Math.round(d.netProfit / 10000),
    누적: Math.round(d.cumulative / 10000),
  }));

  // 손익분기점 찾기
  const breakEvenYear = chartData.find((d, i) =>
    i > 0 && chartData[i - 1].누적 < 0 && d.누적 >= 0
  )?.yearNum || 0;

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}만원
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Y축 포맷터
  const formatYAxis = (value: number) => {
    if (Math.abs(value) >= 10000) {
      return `${(value / 10000).toFixed(0)}억`;
    }
    return `${value.toLocaleString()}만`;
  };

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => value.replace('년', '')}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={formatYAxis}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "12px" }}
            verticalAlign="top"
            height={36}
          />

          {/* 0선 */}
          <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />

          {/* 손익분기점 표시 */}
          {breakEvenYear > 0 && (
            <ReferenceLine
              x={`${breakEvenYear}년`}
              stroke="#22c55e"
              strokeDasharray="5 5"
              label={{
                value: "손익분기",
                position: "top",
                fill: "#22c55e",
                fontSize: 12,
              }}
            />
          )}

          {/* 수익 바 차트 */}
          <Bar
            dataKey="수익"
            fill="#3b82f6"
            opacity={0.8}
            barSize={20}
            name="연간 수익"
          />

          {/* 비용 바 차트 */}
          <Bar
            dataKey="비용"
            fill="#ef4444"
            opacity={0.6}
            barSize={20}
            name="연간 비용"
          />

          {/* 누적 수익 영역 차트 */}
          <Area
            type="monotone"
            dataKey="누적"
            stroke="#8b5cf6"
            fill="#8b5cf6"
            fillOpacity={0.2}
            strokeWidth={2}
            name="누적 수익"
          />

          {/* 순이익 라인 */}
          <Line
            type="monotone"
            dataKey="순이익"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ fill: "#22c55e", r: 3 }}
            name="연간 순이익"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
