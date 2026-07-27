"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

// Adapted from shadcn/ui's `chart` registry primitive for this project's own
// `cn` util and recharts@2 (this project's pinned version — the upstream
// registry targets recharts@3, but the ChartContainer/Tooltip API used here
// is unchanged between the two majors). Deliberately trimmed to what this
// project's charts need: no ChartLegend (every current chart here is
// single-series, and per the dataviz skill a single series needs no legend
// box — the card title names it).

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    color?: string;
  }
>;

interface ChartContextValue {
  config: ChartConfig;
}

const ChartContext = React.createContext<ChartContextValue | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("Chart components must be used within a <ChartContainer>");
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
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden flex aspect-video justify-center text-xs",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, cfg]) => cfg.color);

  if (!colorConfig.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `[data-chart=${id}] {\n${colorConfig
          .map(([key, cfg]) => `  --color-${key}: ${cfg.color};`)
          .join("\n")}\n}`,
      }}
    />
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> & {
  className?: string;
  indicator?: "line" | "dot" | "dashed";
  hideLabel?: boolean;
  hideIndicator?: boolean;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  const tooltipLabel = hideLabel ? null : (
    <div className="font-medium">
      {labelFormatter ? labelFormatter(label, payload) : label}
    </div>
  );

  return (
    <div
      className={cn(
        "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-white px-2.5 py-1.5 text-xs shadow-xl",
        className,
      )}
    >
      {tooltipLabel}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = String(item.dataKey ?? item.name ?? index);
          const itemConfig = config[key];
          const indicatorColor = item.color;

          return (
            <div
              key={item.dataKey ?? index}
              className="flex w-full items-center gap-2"
            >
              {!hideIndicator && (
                <div
                  className={cn("shrink-0 rounded-[2px]", {
                    "h-2.5 w-2.5": indicator === "dot",
                    "w-1 self-stretch": indicator === "line",
                    "w-0 border-[1.5px] border-dashed bg-transparent self-stretch":
                      indicator === "dashed",
                  })}
                  style={{
                    backgroundColor:
                      indicator === "dashed" ? undefined : indicatorColor,
                    borderColor: indicatorColor,
                  }}
                />
              )}
              <div className="flex flex-1 justify-between leading-none items-center">
                <span className="text-gray-500">
                  {itemConfig?.label ?? item.name}
                </span>
                <span className="font-mono font-medium text-gray-900 tabular-nums ml-2">
                  {item.value?.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent };
