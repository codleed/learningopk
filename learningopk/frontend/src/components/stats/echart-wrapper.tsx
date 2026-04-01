"use client";

import { useEffect, useRef, useCallback } from "react";
import type { EChartsOption } from "echarts";

export interface EChartWrapperProps {
  option: EChartsOption;
  height?: string;
  className?: string;
  loading?: boolean;
}

/**
 * Reusable ECharts wrapper with dynamic import, auto-resize, and CSS variable theming.
 * Uses ResizeObserver for responsive chart behavior.
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

  const getThemeColors = useCallback(() => {
    if (typeof window === "undefined") {
      return {
        textPrimary: "#F1F5F9",
        textSecondary: "#94A3B8",
        textMuted: "#4B5472",
        borderDefault: "rgba(255, 255, 255, 0.08)",
        bgSurface: "#151825",
        accentPrimary: "#6366F1",
        accentSuccess: "#22C55E",
        accentWarning: "#F59E0B",
        accentDanger: "#EF4444",
        accentInfo: "#38BDF8",
      };
    }
    const styles = getComputedStyle(document.documentElement);
    return {
      textPrimary: styles.getPropertyValue("--text-primary").trim() || "#F1F5F9",
      textSecondary: styles.getPropertyValue("--text-secondary").trim() || "#94A3B8",
      textMuted: styles.getPropertyValue("--text-muted").trim() || "#4B5472",
      borderDefault: styles.getPropertyValue("--border-default").trim() || "rgba(255,255,255,0.08)",
      bgSurface: styles.getPropertyValue("--bg-surface").trim() || "#151825",
      accentPrimary: styles.getPropertyValue("--accent-primary").trim() || "#6366F1",
      accentSuccess: styles.getPropertyValue("--accent-success").trim() || "#22C55E",
      accentWarning: styles.getPropertyValue("--accent-warning").trim() || "#F59E0B",
      accentDanger: styles.getPropertyValue("--accent-danger").trim() || "#EF4444",
      accentInfo: styles.getPropertyValue("--accent-info").trim() || "#38BDF8",
    };
  }, []);

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

      const colors = getThemeColors();

      const mergedOption: EChartsOption = {
        ...option,
        textStyle: {
          fontFamily: "var(--font-body), 'DM Sans', system-ui, sans-serif",
          color: colors.textSecondary,
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
          color: colors.accentPrimary,
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

  /* Update option reactively */
  useEffect(() => {
    if (!chartRef.current) return;

    const colors = getThemeColors();

    const mergedOption: EChartsOption = {
      ...option,
      textStyle: {
        fontFamily: "var(--font-body), 'DM Sans', system-ui, sans-serif",
        color: colors.textSecondary,
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
        color: colors.accentPrimary,
        maskColor: "transparent",
      });
    } else {
      chartRef.current.hideLoading();
    }
  }, [option, loading, getThemeColors]);

  /* ResizeObserver for responsive */
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

  /* Theme change observer */
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (!chartRef.current || !echartsRef.current) return;
      const colors = getThemeColors();

      chartRef.current.setOption({
        textStyle: {
          color: colors.textSecondary,
        },
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [getThemeColors]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height }}
    />
  );
}
