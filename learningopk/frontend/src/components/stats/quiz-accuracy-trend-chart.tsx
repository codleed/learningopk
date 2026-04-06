"use client";

import { useId, useMemo } from "react";
import type { EChartsOption } from "echarts";

import { ChartDataTable } from "@/components/stats/chart-data-table";
import { EChartWrapper } from "@/components/stats/echart-wrapper";
import { useResolvedTokens } from "@/lib/resolve-css-tokens";
import type { QuizAccuracyPoint } from "@/lib/stats-metrics";

interface QuizAccuracyTrendChartProps {
  data: QuizAccuracyPoint[];
}

export function QuizAccuracyTrendChart({ data }: QuizAccuracyTrendChartProps) {
  const tableId = useId();
  const tokens = useResolvedTokens();

  const option = useMemo((): EChartsOption => {
    const labels = data.map((d) => d.label);
    const percentages = data.map((d) => d.percentage);
    const movingAvg = data.map((d) => d.movingAverage);

    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: tokens.bgElevated,
        borderColor: tokens.borderDefault,
        borderWidth: 1,
        textStyle: {
          color: tokens.textPrimary,
          fontSize: 12,
        },
        axisPointer: {
          type: "cross",
          crossStyle: {
            color: tokens.textMuted,
          },
        },
      },
      legend: {
        data: ["Score", "Moving Avg"],
        top: 0,
        right: 0,
        textStyle: {
          color: tokens.textSecondary,
          fontSize: 11,
        },
        itemWidth: 16,
        itemHeight: 3,
      },
      xAxis: {
        type: "category",
        data: labels,
        boundaryGap: false,
        axisLine: { lineStyle: { color: tokens.borderDefault } },
        axisTick: { show: false },
        axisLabel: {
          color: tokens.textMuted,
          fontSize: 11,
        },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        name: "Accuracy %",
        nameTextStyle: {
          color: tokens.textMuted,
          fontSize: 11,
        },
        splitLine: {
          lineStyle: {
            color: tokens.borderDefault,
            type: "dashed",
          },
        },
        axisLabel: {
          color: tokens.textMuted,
          fontSize: 11,
          formatter: "{value}%",
        },
      },
      series: [
        {
          name: "Score",
          type: "line",
          data: percentages,
          smooth: false,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: {
            color: tokens.accentInfo,
            width: 2,
          },
          itemStyle: {
            color: tokens.accentInfo,
            borderColor: tokens.bgSurface,
            borderWidth: 2,
          },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: tokens.accentInfo + "40" },
                { offset: 1, color: tokens.accentInfo + "05" },
              ],
            },
          },
        },
        {
          name: "Moving Avg",
          type: "line",
          data: movingAvg,
          smooth: true,
          symbol: "none",
          lineStyle: {
            color: tokens.accentPrimary,
            width: 2.5,
            type: "solid",
          },
        },
      ],
      grid: {
        top: 48,
        right: 16,
        bottom: 32,
        left: 50,
      },
      animationDuration: 1000,
      animationEasing: "cubicOut",
    };
  }, [data, tokens]);

  if (data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-text-muted">
        No quiz data available yet. Take some quizzes to see your accuracy trend.
      </div>
    );
  }

  return (
    <div aria-describedby={tableId}>
      <div aria-hidden="true">
        <EChartWrapper option={option} height="320px" />
      </div>
      <ChartDataTable
        id={tableId}
        caption="Quiz accuracy trend over time"
        headers={["Date", "Accuracy %", "Moving average %"]}
        rows={data.map((d) => [d.label, `${d.percentage}%`, `${d.movingAverage}%`])}
      />
    </div>
  );
}
