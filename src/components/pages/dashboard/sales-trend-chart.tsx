"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Locale } from "@/types/i18n";

interface SalesByDay {
  date: string;
  total: number;
  count: number;
}

interface SalesTrendChartProps {
  data: SalesByDay[];
  locale: Locale;
  seriesLabel: string;
}

export function SalesTrendChart({ data, locale, seriesLabel }: SalesTrendChartProps) {
  const chartConfig = {
    total: {
      label: seriesLabel,
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  const formatted = data.map((day) => ({
    ...day,
    label: new Date(day.date).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
    }),
  }));

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
      <AreaChart accessibilityLayer data={formatted} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent labelFormatter={(_, payload) => payload?.[0]?.payload?.label} />}
        />
        <defs>
          <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <Area
          dataKey="total"
          type="natural"
          fill="url(#fillTotal)"
          fillOpacity={1}
          stroke="var(--color-total)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
