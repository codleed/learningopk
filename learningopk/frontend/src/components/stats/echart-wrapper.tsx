"use client";

import { useEffect, useRef } from "react";
import type { EChartsOption } from "echarts";
import { useResolvedTokens } from "@/lib/resolve-css-tokens";
import type { ResolvedTokens } from "@/lib/resolve-css-tokens";

export type { ResolvedTokens };

export interface EChartWrapperProps {
  option: EChartsOption;
  height?: string;
  className?: string;
  loading?: boolean;
}

/**
 * Reusable ECharts wrapper with dynamic import, auto-resize, and theme-aware
 * color resolution.
 *
 * CSS variables are resolved to actual hex/rgba values via `useResolvedTokens`
 * before being passed to ECharts (canvas cannot access CSS custom properties).
 * The hook automatically re-resolves when the theme changes (light ↔ dark).
 */
export function EChartWrapper({
  option,
  height = "320px",
  className,
  loading = false,
}: EChartWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("echarts")["init"]> | null>(null);
  const echartsRef = useRef<typeof import("echarts") | null>(null);

  const tokens = useResolvedTokens();

  /* ── Initialise ECharts instance ── */
  useEffect(() => {
    let disposed = false;

    const initChart = async () => {
      if (!containerRef.current) return;

      const echarts = await import("echarts");
      echartsRef.current = echarts;

      if (disposed || !containerRef.current) return;

      const chart = echarts.init(containerRef.current, undefined, {
        renderer: "canvas",
      });
      chartRef.current = chart;

      const mergedOption: EChartsOption = {
        ...option,
        textStyle: {
          fontFamily: "'DM Sans', system-ui, sans-serif",
          color: tokens.textSecondary,
          ...(option.textStyle as Record<string, unknown>),
        },
        grid: {
          top: 40,
          right: 20,
          bottom: 40,
          left: 50,
          containLabel: true,
          ...(option.grid && !Array.isArray(option.grid) ? option.grid : {}),
        },
      };

      chart.setOption(mergedOption);

      if (loading) {
        chart.showLoading({
          text: "",
          color: tokens.accentPrimary,
          maskColor: "transparent",
        });
      }
    };

    void initChart();

    return () => {
      disposed = true;
      if (chartRef.current) {
        chartRef.current.dispose();
        chartRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Update option reactively (data changes + theme changes) ── */
  useEffect(() => {
    if (!chartRef.current) return;

    const mergedOption: EChartsOption = {
      ...option,
      textStyle: {
        fontFamily: "'DM Sans', system-ui, sans-serif",
        color: tokens.textSecondary,
        ...(option.textStyle as Record<string, unknown>),
      },
      grid: {
        top: 40,
        right: 20,
        bottom: 40,
        left: 50,
        containLabel: true,
        ...(option.grid && !Array.isArray(option.grid) ? option.grid : {}),
      },
    };

    chartRef.current.setOption(mergedOption, { notMerge: true });

    if (loading) {
      chartRef.current.showLoading({
        text: "",
        color: tokens.accentPrimary,
        maskColor: "transparent",
      });
    } else {
      chartRef.current.hideLoading();
    }
  }, [option, loading, tokens]);

  /* ── ResizeObserver for responsive sizing ── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      chartRef.current?.resize();
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height }}
    />
  );
}
