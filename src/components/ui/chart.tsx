"use client";

import * as React from "react";
import {
  Legend as RechartsLegend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    color?: string;
  }
>;

type ChartContextValue = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextValue | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
}) {
  const style = React.useMemo(() => {
    return Object.entries(config).reduce((acc, [key, value]) => {
      if (value.color) {
        acc[`--color-${key}`] = value.color;
      }
      return acc;
    }, {} as Record<string, string>);
  }, [config]);

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={id}
        className={cn(
          "flex h-[240px] w-full items-center justify-center text-xs",
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
          "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/60",
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
          "[&_.recharts-layer:focus]:outline-none",
          "[&_.recharts-pie-label-text]:fill-foreground",
          "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border/60",
          "[&_.recharts-radial-bar-background-sector]:fill-muted",
          "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-border",
          "[&_.recharts-sector:focus]:outline-none",
          "[&_.recharts-tooltip-wrapper]:outline-none",
          className
        )}
        style={style as React.CSSProperties}
        {...props}
      >
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartTooltip = RechartsTooltip;

function ChartTooltipContent({
  active,
  payload,
  label,
  hideLabel = false,
  indicator = "dot",
  className,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{
    color?: string;
    dataKey?: string | number;
    name?: string;
    value?: number | string;
    payload?: Record<string, unknown>;
  }>;
  label?: React.ReactNode;
  hideLabel?: boolean;
  indicator?: "dot" | "line";
  className?: string;
  formatter?: (
    value: number | string,
    name: string,
    item: {
      color?: string;
      dataKey?: string | number;
      name?: string;
      value?: number | string;
      payload?: Record<string, unknown>;
    }
  ) => React.ReactNode;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "grid min-w-[180px] gap-2 rounded-xl border border-white/10 bg-[#091221]/95 px-3 py-2 text-xs text-white shadow-2xl",
        className
      )}
    >
      {!hideLabel && label ? <div className="font-medium text-white/80">{label}</div> : null}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = String(item.dataKey ?? item.name ?? index);
          const itemConfig = config[key];
          const itemLabel = itemConfig?.label ?? item.name ?? key;
          const itemColor = item.color || itemConfig?.color || "currentColor";

          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-white/80">
                <span
                  className={cn("shrink-0 rounded-full", indicator === "dot" ? "size-2.5" : "h-0.5 w-3")}
                  style={{ backgroundColor: itemColor }}
                />
                <span>{itemLabel}</span>
              </div>
              <span className="font-semibold text-white">
                {formatter ? formatter(item.value ?? 0, String(itemLabel), item) : item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartLegend = RechartsLegend;

function ChartLegendContent({
  payload,
  className,
}: {
  payload?: Array<{
    color?: string;
    dataKey?: string | number;
    value?: string;
  }>;
  className?: string;
}) {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-3 text-xs", className)}>
      {payload.map((item, index) => {
        const key = String(item.dataKey ?? item.value ?? index);
        const itemConfig = config[key];
        const label = itemConfig?.label ?? item.value ?? key;
        const color = item.color || itemConfig?.color || "currentColor";

        return (
          <div key={key} className="flex items-center gap-2 text-muted-foreground">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
};
