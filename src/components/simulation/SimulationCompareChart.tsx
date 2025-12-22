"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { AnalysisResult } from "@/lib/profit-analysis";

interface SimulationResults {
  selfFunding: AnalysisResult;
  bankLoan: AnalysisResult;
  governmentLoan: AnalysisResult;
  factoring: AnalysisResult;
}

interface SimulationCompareChartProps {
  data: SimulationResults;
}

const modelColors = {
  selfFunding: "#2563eb",    // blue
  bankLoan: "#16a34a",       // green
  governmentLoan: "#ca8a04", // yellow
  factoring: "#dc2626",      // red
};

const modelLabels = {
  selfFunding: "자부담 100%",
  bankLoan: "은행 80%",
  governmentLoan: "금융지원사업",
  factoring: "팩토링",
};

export function SimulationCompareChart({ data }: SimulationCompareChartProps) {
  // 차트 데이터 변환
  const chartData = Array.from({ length: 20 }, (_, i) => {
    const year = i + 1;
    return {
      year: `${year}년`,
      yearNum: year,
      selfFunding: data.selfFunding.yearlyData[i]?.cumulative || 0,
      bankLoan: data.bankLoan.yearlyData[i]?.cumulative || 0,
      governmentLoan: data.governmentLoan.yearlyData[i]?.cumulative || 0,
      factoring: data.factoring.yearlyData[i]?.cumulative || 0,
    };
  });

  // Y축 포맷터
  const formatYAxis = (value: number) => {
    if (Math.abs(value) >= 100000000) {
      return `${(value / 100000000).toFixed(1)}억`;
    }
    if (Math.abs(value) >= 10000) {
      return `${(value / 10000).toFixed(0)}만`;
    }
    return value.toString();
  };

  // 툴팁 포맷터
  const formatTooltipValue = (value: number) => {
    return `${value.toLocaleString()}원`;
  };

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="flex justify-between gap-4">
              <span>{modelLabels[entry.dataKey as keyof typeof modelLabels]}:</span>
              <span className="font-medium">{formatTooltipValue(entry.value)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-80 md:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => value.replace("년", "")}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={formatYAxis}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
            verticalAlign="top"
            height={36}
            formatter={(value) => modelLabels[value as keyof typeof modelLabels]}
          />

          {/* 0선 */}
          <ReferenceLine y={0} stroke="#666" strokeDasharray="5 5" />

          {/* 4가지 모델 라인 */}
          <Line
            type="monotone"
            dataKey="selfFunding"
            name="selfFunding"
            stroke={modelColors.selfFunding}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="bankLoan"
            name="bankLoan"
            stroke={modelColors.bankLoan}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="governmentLoan"
            name="governmentLoan"
            stroke={modelColors.governmentLoan}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="factoring"
            name="factoring"
            stroke={modelColors.factoring}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
