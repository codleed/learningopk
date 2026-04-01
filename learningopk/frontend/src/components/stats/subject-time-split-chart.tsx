"use client";

import { useMemo } from "react";
import type { EChartsOption } from "echarts";

import { EChartWrapper } from "@/components/stats/echart-wrapper";
import type { DashboardSummaryResponse } from "@/lib/progress-api";

interface SubjectTimeSplitChartProps {
  subjects: DashboardSummaryResponse["subjects"];
}

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "#6366F1",
  Physics: "#06B6D4",
  Chemistry: "#8B5CF6",
  Biology: "#22C55E",
  English: "#F59E0B",
  Urdu: "#EC4899",
  "Pakistan Studies": "#14B8A6",
  "Computer Science": "#3B82F6",
  Islamiat: "#A855F7",
};

const FALLBACK_COLORS = [
  "#6366F1", "#22C55E", "#F59E0B", "#38BDF8", "#EF4444",
  "#8B5CF6", "#EC4899", "#14B8A6", "#06B6D4", "#D946EF",
];

export function SubjectTimeSplitChart({ subjects }: SubjectTimeSplitChartProps) {
  const option = useMemo((): EChartsOption => {
    const sortedSubjects = [...subjects]
      .sort((a, b) => b.chaptersVisitedPercent - a.chaptersVisitedPercent)
      .slice(0, 8);

    const data = sortedSubjects.map((s, idx) => ({
      name: s.subjectName,
      value: Math.max(s.chaptersVisitedPercent, 1),
      itemStyle: {
        color: SUBJECT_COLORS[s.subjectName] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
      },
    }));

    return {
      tooltip: {
        trigger: "item",
        backgroundColor: "var(--bg-elevated)",
        borderColor: "var(--border-default)",
        borderWidth: 1,
        textStyle: {
          color: "var(--text-primary)",
          fontSize: 12,
        },
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number; percent: number; color: string };
          return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
                    <span style="font-weight:600">${p.name}</span>
                  </div>
                  <div style="color:var(--text-secondary)">${p.percent.toFixed(1)}% of activity</div>`;
        },
      },
      legend: {
        type: "scroll",
        orient: "vertical",
        right: 0,
        top: "middle",
        textStyle: {
          color: "var(--text-secondary)",
          fontSize: 11,
        },
        pageTextStyle: {
          color: "var(--text-muted)",
        },
        pageIconColor: "var(--text-muted)",
        pageIconInactiveColor: "var(--border-default)",
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 12,
      },
      series: [
        {
          type: "pie",
          radius: ["50%", "78%"],
          center: ["35%", "50%"],
          avoidLabelOverlap: false,
          padAngle: 3,
          itemStyle: {
            borderRadius: 6,
          },
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 13,
              fontWeight: "bold",
              color: "var(--text-primary)",
              formatter: "{b}\n{d}%",
            },
            scaleSize: 8,
          },
          labelLine: {
            show: false,
          },
          data,
          animationType: "scale",
          animationEasing: "cubicOut",
          animationDuration: 1000,
        },
      ],
    };
  }, [subjects]);

  if (subjects.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-text-muted">
        No subject data available yet.
      </div>
    );
  }

  return <EChartWrapper option={option} height="320px" />;
}
