"use client";

import { useId, useMemo } from "react";
import type { EChartsOption } from "echarts";

import { ChartDataTable } from "@/components/stats/chart-data-table";
import { EChartWrapper } from "@/components/stats/echart-wrapper";
import { useResolvedTokens } from "@/lib/resolve-css-tokens";
import type { WeeklyStudyTrendPoint } from "@/lib/stats-metrics";

interface WeeklyStudyTimeChartProps {
  data: WeeklyStudyTrendPoint[];
}

export function WeeklyStudyTimeChart({ data }: WeeklyStudyTimeChartProps) {
  const tableId = useId();
  const tokens = useResolvedTokens();

  const option = useMemo((): EChartsOption => {
    const labels = data.map((d) => d.label);
    const hours = data.map((d) => d.estimatedHours);

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
        formatter: (params: unknown) => {
          const p = (params as Array<{ name: string; value: number }>)[0];
          if (!p) return "";
          return `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>
                  <div style="color:${tokens.accentPrimary}">~${p.value}h estimated</div>`;
        },
      },
      xAxis: {
        type: "category",
        data: labels,
        axisLine: { lineStyle: { color: tokens.borderDefault } },
        axisTick: { show: false },
        axisLabel: {
          color: tokens.textMuted,
          fontSize: 11,
          rotate: labels.length > 6 ? 30 : 0,
        },
      },
      yAxis: {
        type: "value",
        name: "~Hours (est.)",
        nameTextStyle: {
          color: tokens.textMuted,
          fontSize: 11,
          padding: [0, 0, 0, 0],
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
          formatter: "~{value}h",
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
                { offset: 0, color: tokens.accentPrimary },
                { offset: 1, color: tokens.accentPrimary + "4D" },
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
                  { offset: 0, color: tokens.accentPrimaryHover },
                  { offset: 1, color: tokens.accentPrimary + "80" },
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
  }, [data, tokens]);

  if (data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-text-muted">
        No study data available yet.
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
        caption="Weekly study time in estimated hours (derived from activity events)"
        headers={["Week", "~Hours (estimated)"]}
        rows={data.map((d) => [d.label, `~${d.estimatedHours}h`])}
      />
    </div>
  );
}
