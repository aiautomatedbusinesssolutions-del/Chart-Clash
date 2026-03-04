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
import type { ChartConfig } from "@/lib/types";
import { INDICATOR_META } from "@/lib/constants/indicators";

interface CandlestickChartProps {
  config: ChartConfig;
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

export function CandlestickChart({
  config,
  height = 250,
}: CandlestickChartProps) {
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

    // Candlestick series on main pane (pane 0)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#34d399",
      downColor: "#fb7185",
      borderUpColor: "#34d399",
      borderDownColor: "#fb7185",
      wickUpColor: "#34d399",
      wickDownColor: "#fb7185",
    });
    candleSeries.setData(config.candles);

    // Add indicator
    const indicator = config.indicator;
    const meta = INDICATOR_META[indicator.type];

    switch (indicator.type) {
      case "rsi": {
        const rsiSeries = chart.addSeries(LineSeries, {
          color: meta.color,
          lineWidth: 3,
          priceScaleId: "rsi",
        }, 1);
        rsiSeries.setData(indicator.values);

        // Overbought / oversold reference lines
        const overbought = indicator.values.map((v) => ({
          time: v.time,
          value: 70,
        }));
        const oversold = indicator.values.map((v) => ({
          time: v.time,
          value: 30,
        }));

        const obSeries = chart.addSeries(LineSeries, {
          color: "#fb718580",
          lineWidth: 1,
          lineStyle: 2,
          priceScaleId: "rsi",
          crosshairMarkerVisible: false,
        }, 1);
        obSeries.setData(overbought);

        const osSeries = chart.addSeries(LineSeries, {
          color: "#34d39980",
          lineWidth: 1,
          lineStyle: 2,
          priceScaleId: "rsi",
          crosshairMarkerVisible: false,
        }, 1);
        osSeries.setData(oversold);
        break;
      }

      case "bollinger": {
        // Overlay on main pane (pane 0)
        const upperSeries = chart.addSeries(LineSeries, {
          color: meta.secondaryColor ?? meta.color,
          lineWidth: 2,
          crosshairMarkerVisible: false,
        });
        upperSeries.setData(indicator.upper);

        const middleSeries = chart.addSeries(LineSeries, {
          color: meta.color,
          lineWidth: 2,
          lineStyle: 2,
          crosshairMarkerVisible: false,
        });
        middleSeries.setData(indicator.middle);

        const lowerSeries = chart.addSeries(LineSeries, {
          color: meta.secondaryColor ?? meta.color,
          lineWidth: 2,
          crosshairMarkerVisible: false,
        });
        lowerSeries.setData(indicator.lower);
        break;
      }

      case "macd": {
        const macdLineSeries = chart.addSeries(LineSeries, {
          color: meta.color,
          lineWidth: 3,
          priceScaleId: "macd",
        }, 1);
        macdLineSeries.setData(indicator.macdLine);

        const signalSeries = chart.addSeries(LineSeries, {
          color: meta.secondaryColor ?? "#fb923c",
          lineWidth: 3,
          priceScaleId: "macd",
        }, 1);
        signalSeries.setData(indicator.signalLine);

        const histSeries = chart.addSeries(HistogramSeries, {
          priceScaleId: "macd",
        }, 1);
        histSeries.setData(indicator.histogram);

        // Zero reference line
        const zeroLine = indicator.macdLine.map((v) => ({
          time: v.time,
          value: 0,
        }));
        const zeroSeries = chart.addSeries(LineSeries, {
          color: "#94a3b840",
          lineWidth: 1,
          lineStyle: 2,
          priceScaleId: "macd",
          crosshairMarkerVisible: false,
        }, 1);
        zeroSeries.setData(zeroLine);
        break;
      }

      case "ma_crossover": {
        // Overlay on main pane
        const shortSeries = chart.addSeries(LineSeries, {
          color: meta.color,
          lineWidth: 3,
          crosshairMarkerVisible: false,
        });
        shortSeries.setData(indicator.shortMA);

        const longSeries = chart.addSeries(LineSeries, {
          color: meta.secondaryColor ?? "#fbbf24",
          lineWidth: 3,
          crosshairMarkerVisible: false,
        });
        longSeries.setData(indicator.longMA);
        break;
      }

      case "stochastic": {
        const kSeries = chart.addSeries(LineSeries, {
          color: meta.color,
          lineWidth: 3,
          priceScaleId: "stoch",
        }, 1);
        kSeries.setData(indicator.kLine);

        const dSeries = chart.addSeries(LineSeries, {
          color: meta.secondaryColor ?? "#fbbf24",
          lineWidth: 3,
          priceScaleId: "stoch",
        }, 1);
        dSeries.setData(indicator.dLine);

        // Overbought / oversold reference lines
        const ob = indicator.kLine.map((v) => ({ time: v.time, value: 80 }));
        const os = indicator.kLine.map((v) => ({ time: v.time, value: 20 }));

        const obSeries = chart.addSeries(LineSeries, {
          color: "#fb718580",
          lineWidth: 1,
          lineStyle: 2,
          priceScaleId: "stoch",
          crosshairMarkerVisible: false,
        }, 1);
        obSeries.setData(ob);

        const osSeries = chart.addSeries(LineSeries, {
          color: "#34d39980",
          lineWidth: 1,
          lineStyle: 2,
          priceScaleId: "stoch",
          crosshairMarkerVisible: false,
        }, 1);
        osSeries.setData(os);
        break;
      }
    }

    chart.timeScale().fitContent();

    // Resize observer
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
  }, [config, height]);

  return <div ref={containerRef} className="w-full" />;
}
