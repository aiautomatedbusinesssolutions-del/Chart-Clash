"use client";

import { useRef, useLayoutEffect } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  type IChartApi,
  type DeepPartial,
  type ChartOptions,
} from "lightweight-charts";
import type { CandleData, RSIIndicatorData, MACDIndicatorData } from "@/lib/types";

interface ConfluenceChartProps {
  candles: CandleData[];
  rsi: RSIIndicatorData;
  macd: MACDIndicatorData;
  height?: number;
}

const CHART_OPTIONS: DeepPartial<ChartOptions> = {
  layout: {
    background: { color: "transparent" },
    textColor: "#94a3b8",
    fontFamily: "Inter, sans-serif",
    fontSize: 11,
  },
  grid: {
    vertLines: { color: "#1e293b" },
    horzLines: { color: "#1e293b" },
  },
  handleScroll: false,
  handleScale: false,
  crosshair: {
    vertLine: { visible: false },
    horzLine: { visible: false },
  },
  rightPriceScale: {
    borderColor: "#1e293b",
  },
  timeScale: {
    borderColor: "#1e293b",
    timeVisible: false,
  },
};

export function ConfluenceChart({
  candles,
  rsi,
  macd,
  height = 350,
}: ConfluenceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      ...CHART_OPTIONS,
      width: container.clientWidth,
      height,
    });
    chartRef.current = chart;

    // Pane 0: Candlesticks
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#34d399",
      downColor: "#fb7185",
      borderUpColor: "#34d399",
      borderDownColor: "#fb7185",
      wickUpColor: "#34d399",
      wickDownColor: "#fb7185",
    });
    candleSeries.setData(candles);

    // Pane 1: RSI
    const rsiSeries = chart.addSeries(LineSeries, {
      color: "#38bdf8",
      lineWidth: 2,
      priceScaleId: "rsi",
    }, 1);
    rsiSeries.setData(rsi.values);

    // RSI reference lines
    const obLine = rsi.values.map((v) => ({ time: v.time, value: 70 }));
    const osLine = rsi.values.map((v) => ({ time: v.time, value: 30 }));

    const obSeries = chart.addSeries(LineSeries, {
      color: "#fb718580",
      lineWidth: 1,
      lineStyle: 2,
      priceScaleId: "rsi",
      crosshairMarkerVisible: false,
    }, 1);
    obSeries.setData(obLine);

    const osSeries = chart.addSeries(LineSeries, {
      color: "#34d39980",
      lineWidth: 1,
      lineStyle: 2,
      priceScaleId: "rsi",
      crosshairMarkerVisible: false,
    }, 1);
    osSeries.setData(osLine);

    // Pane 2: MACD
    const macdLineSeries = chart.addSeries(LineSeries, {
      color: "#38bdf8",
      lineWidth: 2,
      priceScaleId: "macd",
    }, 2);
    macdLineSeries.setData(macd.macdLine);

    const signalSeries = chart.addSeries(LineSeries, {
      color: "#fb923c",
      lineWidth: 2,
      priceScaleId: "macd",
    }, 2);
    signalSeries.setData(macd.signalLine);

    const histSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: "macd",
    }, 2);
    histSeries.setData(macd.histogram);

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, rsi, macd, height]);

  return <div ref={containerRef} className="w-full" />;
}
