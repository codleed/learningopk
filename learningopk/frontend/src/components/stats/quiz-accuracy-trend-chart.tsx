"use client";

import { useMemo } from "react";
import type { EChartsOption } from "echarts";

import { EChartWrapper } from "@/components/stats/echart-wrapper";
import type { QuizAccuracyPoint } from "@/lib/stats-metrics";

interface QuizAccuracyTrendChartProps {
  data: QuizAccuracyPoint[];
}

export function QuizAccuracyTrendChart({ data }: QuizAccuracyTrendChartProps) {
  const option = useMemo((): EChartsOption => {
    const labels = data.map((d) => d.label);
    const percentages = data.map((d) => d.percentage);
    const movingAvg = data.map((d) => d.movingAverage);

    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: "var(--bg-elevated)",
        borderColor: "var(--border-default)",
        borderWidth: 1,
        textStyle: {
          color: "var(--text-primary)",
          fontSize: 12,
        },
        axisPointer: {
          type: "cross",
          crossStyle: {
            color: "var(--text-muted)",
          },
        },
      },
      legend: {
        data: ["Score", "Moving Avg"],
        top: 0,
        right: 0,
        textStyle: {
          color: "var(--text-secondary)",
          fontSize: 11,
        },
        itemWidth: 16,
        itemHeight: 3,
      },
      xAxis: {
        type: "category",
        data: labels,
        boundaryGap: false,
        axisLine: { lineStyle: { color: "var(--border-default)" } },
        axisTick: { show: false },
        axisLabel: {
          color: "var(--text-muted)",
          fontSize: 11,
        },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        name: "Accuracy %",
        nameTextStyle: {
          color: "var(--text-muted)",
          fontSize: 11,
        },
        splitLine: {
          lineStyle: {
            color: "var(--border-default)",
            type: "dashed",
          },
        },
        axisLabel: {
          color: "var(--text-muted)",
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
            color: "var(--accent-info)",
            width: 2,
          },
          itemStyle: {
            color: "var(--accent-info)",
            borderColor: "var(--bg-surface)",
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
                { offset: 0, color: "rgba(56, 189, 248, 0.25)" },
                { offset: 1, color: "rgba(56, 189, 248, 0.02)" },
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
            color: "var(--accent-primary)",
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
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-text-muted">
        No quiz data available yet. Take some quizzes to see your accuracy trend.
      </div>
    );
  }

  return <EChartWrapper option={option} height="320px" />;
}
