"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  createChart,
  type IChartApi,
  type DeepPartial,
  type ChartOptions,
  type ISeriesApi,
  ColorType,
} from "lightweight-charts";

export interface ChartDataPoint {
  time: string; // YYYY-MM-DD
  value: number;
}

interface LightweightChartProps {
  data: ChartDataPoint[];
  height?: number;
  color?: string;
  type?: "area" | "line";
  theme?: "dark" | "light";
}

export function LightweightChart({
  data,
  height = 140,
  color = "#3b82f6",
  type = "area",
  theme = "dark",
}: LightweightChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | ISeriesApi<"Line"> | null>(null);

  const isDark = theme === "dark";

  const getChartOptions = useCallback(
    (): DeepPartial<ChartOptions> => ({
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: isDark ? "#6b7280" : "#9ca3af",
        fontSize: 10,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: isDark ? "#1f293780" : "#e5e7eb80", style: 2 },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.05 },
      },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      crosshair: {
        vertLine: { labelVisible: false },
        horzLine: { labelVisible: true },
      },
      handleScroll: false,
      handleScale: false,
    }),
    [isDark]
  );

  // Create chart on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      ...getChartOptions(),
      width: containerRef.current.clientWidth,
      height,
    });

    const sortedData = [...data]
      .sort((a, b) => a.time.localeCompare(b.time))
      .map((d) => ({ time: d.time, value: d.value }));

    if (type === "area") {
      const series = chart.addAreaSeries({
        lineColor: color,
        topColor: color + "30",
        bottomColor: "transparent",
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 3,
      });
      series.setData(sortedData);
      seriesRef.current = series;
    } else {
      const series = chart.addLineSeries({
        color,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 3,
      });
      series.setData(sortedData);
      seriesRef.current = series;
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update data when it changes
  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;
    const sortedData = [...data]
      .sort((a, b) => a.time.localeCompare(b.time))
      .map((d) => ({ time: d.time, value: d.value }));
    seriesRef.current.setData(sortedData);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  // Update theme
  useEffect(() => {
    chartRef.current?.applyOptions(getChartOptions());
  }, [theme, getChartOptions]);

  return <div ref={containerRef} style={{ height }} />;
}
