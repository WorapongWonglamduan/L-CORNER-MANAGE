"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface TopProduct {
  id?: string;
  name_i18n?: { th: string; en: string };
  code?: string;
  totalRevenue: number;
}

interface TopProductsChartProps {
  data: TopProduct[];
  locale: "th" | "en";
  seriesLabel: string;
}

export function TopProductsChart({ data, locale, seriesLabel }: TopProductsChartProps) {
  const chartConfig = {
    totalRevenue: {
      label: seriesLabel,
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  const chartData = data.map((product) => ({
    name: product.name_i18n?.[locale] || product.code || "-",
    totalRevenue: product.totalRevenue,
  }));

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
      <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ right: 24 }}>
        <CartesianGrid horizontal={false} />
        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} hide />
        <XAxis dataKey="totalRevenue" type="number" hide />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <Bar dataKey="totalRevenue" fill="var(--color-totalRevenue)" radius={4}>
          <LabelList
            dataKey="name"
            position="insideLeft"
            offset={8}
            className="fill-white"
            fontSize={12}
          />
          <LabelList
            dataKey="totalRevenue"
            position="right"
            offset={8}
            className="fill-gray-700 dark:fill-gray-300"
            fontSize={12}
            formatter={(value: number) => `฿${value.toLocaleString()}`}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
