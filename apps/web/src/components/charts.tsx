"use client";
/** Recharts wrappers themed to the Capital palette. */
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compactMoney } from "@/lib/api";

export const PALETTE = ["#818CF8", "#F472B6", "#34D399", "#FBBF24", "#60A5FA", "#A78BFA", "#F87171", "#2DD4BF"];

const tooltipStyle = {
  contentStyle: { background: "#1f1f24", border: "1px solid #27272a", borderRadius: 12, fontSize: 12, color: "#fff" },
  labelStyle: { color: "#a1a1aa", fontSize: 11 },
  cursor: { fill: "rgba(129,140,248,0.06)" },
};

export function TrendArea({ data, x, series, money = true, height = 240 }: { data: any[]; x: string; series: { key: string; color?: string; label?: string }[]; money?: boolean; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color ?? PALETTE[i]} stopOpacity={0.32} />
              <stop offset="100%" stopColor={s.color ?? PALETTE[i]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="#27272a" strokeDasharray="3 6" vertical={false} />
        <XAxis dataKey={x} tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => (money ? compactMoney(v) : String(v))} width={52} />
        <Tooltip {...tooltipStyle} formatter={(v: any, name: any) => [money ? compactMoney(Number(v)) : v, name]} />
        {series.map((s, i) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.label ?? s.key} stroke={s.color ?? PALETTE[i]} strokeWidth={2} fill={`url(#grad-${s.key})`} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Bars({ data, x, y, color = "#818CF8", money = true, height = 240, horizontal }: { data: any[]; x: string; y: string; color?: string; money?: boolean; height?: number; horizontal?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#27272a" strokeDasharray="3 6" vertical={false} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => (money ? compactMoney(v) : String(v))} />
            <YAxis type="category" dataKey={x} tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} width={92} />
          </>
        ) : (
          <>
            <XAxis dataKey={x} tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => (money ? compactMoney(v) : String(v))} width={52} />
          </>
        )}
        <Tooltip {...tooltipStyle} formatter={(v: any) => [money ? compactMoney(Number(v)) : v, ""]} />
        <Bar dataKey={y} radius={[6, 6, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={color} fillOpacity={0.85} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, nameKey, valueKey, height = 240 }: { data: any[]; nameKey: string; valueKey: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius="62%" outerRadius="88%" paddingAngle={3} strokeWidth={0}>
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip {...tooltipStyle} formatter={(v: any, name: any) => [compactMoney(Number(v)), name]} />
      </PieChart>
    </ResponsiveContainer>
  );
}
