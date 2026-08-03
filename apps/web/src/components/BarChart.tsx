"use client";

import { useState } from "react";

export type BarDatum = {
  label: string;
  value: number;
  formatted: string;
  color?: string;
};

function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  }
  if (abs >= 1_000) {
    return `${(n / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}K`;
  }
  return String(Math.round(n));
}

function niceCeil(n: number): number {
  if (n <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(n));
  const m = n / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

export default function BarChart({
  data,
  height = 200,
  color = "#171717",
  axisFormatter = compact,
}: {
  data: BarDatum[];
  height?: number;
  color?: string;
  axisFormatter?: (n: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 720;
  const H = height;
  const AXIS_W = 46;
  const LABEL_H = 22;
  const PLOT_W = W - AXIS_W;
  const PLOT_H = H - LABEL_H;

  const lo = Math.min(...data.map((d) => d.value), 0);
  const hi = Math.max(...data.map((d) => d.value), 0);
  const loNice = lo < 0 ? -niceCeil(-lo) : 0;
  const hiNice = Math.max(niceCeil(hi), 1);
  const span = Math.max(hiNice - loNice, 1);
  const yFor = (v: number) => PLOT_H - ((v - loNice) / span) * PLOT_H;
  const zeroY = yFor(0);
  const bw = PLOT_W / Math.max(data.length, 1);

  const grid = Array.from({ length: 5 }, (_, i) => {
    const v = loNice + (span * i) / 4;
    return { v, y: yFor(v) };
  });

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
      >
        {grid.map((g, i) => (
          <g key={i}>
            <line
              x1={AXIS_W}
              y1={g.y}
              x2={W}
              y2={g.y}
              stroke={g.v === 0 ? "#d4d4d4" : "#ececec"}
              strokeWidth={g.v === 0 ? 1.5 : 1}
            />
            <text
              x={AXIS_W - 8}
              y={g.y + 3.5}
              textAnchor="end"
              fontSize="10"
              fill="#a3a3a3"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {axisFormatter(g.v)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const top = Math.min(yFor(d.value), zeroY);
          const bottom = Math.max(yFor(d.value), zeroY);
          const barH = Math.max(bottom - top, d.value === 0 ? 2 : 1.5);
          const x = AXIS_W + i * bw + bw * 0.22;
          const w = Math.max(bw * 0.56, 6);
          const dimmed = hover !== null && hover !== i;
          return (
            <g
              key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={AXIS_W + i * bw}
                y={0}
                width={bw}
                height={PLOT_H}
                fill="transparent"
              />
              <rect
                x={x}
                y={top}
                width={w}
                height={barH}
                fill={d.color ?? color}
                opacity={dimmed ? 0.3 : 1}
                rx="1"
              >
                <title>{`${d.label}: ${d.formatted}`}</title>
              </rect>
              {hover === i && (
                <text
                  x={AXIS_W + i * bw + bw / 2}
                  y={Math.max(top - 6, 10)}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="#171717"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {d.formatted}
                </text>
              )}
              <text
                x={AXIS_W + i * bw + bw / 2}
                y={H - 6}
                textAnchor="middle"
                fontSize="11"
                letterSpacing="0.04em"
                fill="#737373"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {d.label}
              </text>
            </g>
          );
        })}

        {data.length === 0 && (
          <text
            x={W / 2}
            y={H / 2}
            textAnchor="middle"
            fontSize="13"
            fill="#a3a3a3"
          >
            No data available
          </text>
        )}
      </svg>
    </div>
  );
}
