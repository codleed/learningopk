"use client";

import { useMemo } from "react";
import type { EChartsOption } from "echarts";

import { EChartWrapper } from "@/components/stats/echart-wrapper";
import type { WeeklyStudyTrendPoint } from "@/lib/stats-metrics";

interface WeeklyStudyTimeChartProps {
  data: WeeklyStudyTrendPoint[];
}

export function WeeklyStudyTimeChart({ data }: WeeklyStudyTimeChartProps) {
  const option = useMemo((): EChartsOption => {
    const labels = data.map((d) => d.label);
    const hours = data.map((d) => d.estimatedHours);

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
        formatter: (params: unknown) => {
          const p = (params as Array<{ name: string; value: number }>)[0];
          if (!p) return "";
          return `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>
                  <div style="color:var(--accent-primary)">${p.value}h studied</div>`;
        },
      },
      xAxis: {
        type: "category",
        data: labels,
        axisLine: { lineStyle: { color: "var(--border-default)" } },
        axisTick: { show: false },
        axisLabel: {
          color: "var(--text-muted)",
          fontSize: 11,
          rotate: labels.length > 6 ? 30 : 0,
        },
      },
      yAxis: {
        type: "value",
        name: "Hours",
        nameTextStyle: {
          color: "var(--text-muted)",
          fontSize: 11,
          padding: [0, 0, 0, 0],
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
          formatter: "{value}h",
        },
      },
      series: [
        {
          name: "Study Time",
          type: "bar",
          data: hours,
          barWidth: "50%",
          barMaxWidth: 40,
          itemStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "var(--accent-primary)" },
                { offset: 1, color: "rgba(99, 102, 241, 0.3)" },
              ],
            },
            borderRadius: [6, 6, 0, 0],
          },
          emphasis: {
            itemStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: "var(--accent-primary-hover)" },
                  { offset: 1, color: "rgba(99, 102, 241, 0.5)" },
                ],
              },
            },
          },
          animationDelay: (idx: number) => idx * 80,
        },
      ],
      animationEasing: "cubicOut",
      animationDuration: 800,
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-text-muted">
        No study data available yet.
      </div>
    );
  }

  return <EChartWrapper option={option} height="320px" />;
}
