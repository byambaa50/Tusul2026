"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatNumber } from "@/lib/format/mn";

const AXIS_COLOR = "var(--color-ink-500)";
const GRID_COLOR = "var(--color-cream-200)";
const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid rgba(110, 87, 60, 0.18)",
  background: "var(--color-linen)",
  boxShadow: "0 8px 24px -12px rgba(46, 38, 28, 0.2)",
  fontSize: 12,
};

const SERIES_COLORS = [
  "var(--color-forest-700)",
  "var(--color-sage-500)",
  "var(--color-camel-500)",
  "var(--color-terracotta-500)",
  "var(--color-olive-500)",
  "var(--color-forest-600)",
];

type TooltipEntry = {
  name?: string | number;
  value?: string | number;
  color?: string;
  dataKey?: string | number;
};

function OrganicTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div style={TOOLTIP_STYLE} className="px-3 py-2">
      {label ? (
        <p className="text-forest-900 mb-1 text-xs font-semibold">{String(label)}</p>
      ) : null}
      <div className="flex flex-col gap-0.5">
        {payload.map((entry) => {
          const key = String(entry.dataKey ?? "");
          const decimals = key === "batchCount" || key === "totalKg" ? 0 : 1;
          return (
            <p key={`${key}-${entry.name}`} className="text-ink-700 flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}</span>
              <span className="text-forest-900 ml-auto font-medium tabular-nums">
                {formatNumber(Number(entry.value), decimals)}
              </span>
            </p>
          );
        })}
      </div>
    </div>
  );
}

export function SupplyTrendChart({
  data,
  labels,
}: {
  data: Array<{ label: string; totalKg: number; batchCount: number }>;
  labels: { amount: string; batches: string };
}) {
  return (
    <div className="h-72 w-full" role="img" aria-label={`${labels.amount} · ${labels.batches}`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            dy={6}
          />
          <YAxis
            yAxisId="kg"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            tickFormatter={(value) => formatNumber(Number(value))}
            width={52}
          />
          <YAxis
            yAxisId="count"
            orientation="right"
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            width={34}
          />
          <Tooltip content={<OrganicTooltip />} cursor={{ fill: "rgba(163, 177, 138, 0.12)" }} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
          />
          <Bar
            yAxisId="kg"
            dataKey="totalKg"
            name={labels.amount}
            fill="var(--color-sage-400)"
            radius={[6, 6, 0, 0]}
            maxBarSize={44}
          />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="batchCount"
            name={labels.batches}
            stroke="var(--color-forest-700)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--color-forest-700)", strokeWidth: 0 }}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AmountByCategoryChart({
  data,
  amountLabel,
  height = 280,
}: {
  data: Array<{ category: string; totalKg: number }>;
  amountLabel: string;
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full" role="img" aria-label={amountLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            tickFormatter={(value) => formatNumber(Number(value))}
          />
          <YAxis
            type="category"
            dataKey="category"
            tickLine={false}
            axisLine={false}
            width={116}
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
          />
          <Tooltip content={<OrganicTooltip />} cursor={{ fill: "rgba(163, 177, 138, 0.12)" }} />
          <Bar
            dataKey="totalKg"
            name={amountLabel}
            fill="var(--color-forest-600)"
            radius={[0, 6, 6, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function QualityByAimagChart({
  data,
  labels,
}: {
  data: Array<{
    aimag: string;
    cleanYieldPct: number | null;
    finenessMicron: number | null;
  }>;
  labels: { yield: string; fineness: string };
}) {
  return (
    <div className="h-72 w-full" role="img" aria-label={`${labels.yield} · ${labels.fineness}`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="aimag"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            dy={6}
          />
          <YAxis
            yAxisId="yield"
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            tickFormatter={(value) => `${formatNumber(Number(value))}%`}
            width={44}
          />
          <YAxis
            yAxisId="fineness"
            orientation="right"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            tickFormatter={(value) => `${formatNumber(Number(value), 1)}`}
            width={42}
          />
          <Tooltip content={<OrganicTooltip />} cursor={{ fill: "rgba(163, 177, 138, 0.12)" }} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
          />
          <Bar
            yAxisId="yield"
            dataKey="cleanYieldPct"
            name={labels.yield}
            fill="var(--color-sage-500)"
            radius={[6, 6, 0, 0]}
            maxBarSize={42}
          />
          <Line
            yAxisId="fineness"
            type="monotone"
            dataKey="finenessMicron"
            name={labels.fineness}
            stroke="var(--color-camel-500)"
            strokeWidth={2}
            connectNulls
            dot={{ r: 3, fill: "var(--color-camel-500)", strokeWidth: 0 }}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SupplierTypeChart({
  data,
}: {
  data: Array<{ name: string; value: number }>;
}) {
  return (
    <div className="grid items-center gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
      <div className="h-44 w-full" role="img" aria-label={data.map((item) => item.name).join(", ")}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={44}
              outerRadius={68}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((item, index) => (
                <Cell key={item.name} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<OrganicTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-col gap-2">
        {data.map((item, index) => (
          <li key={item.name} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length] }}
            />
            <span className="text-ink-700 min-w-0 flex-1 truncate">{item.name}</span>
            <span className="text-forest-900 font-semibold tabular-nums">
              {formatNumber(item.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
