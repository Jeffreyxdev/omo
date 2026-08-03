"use client";

export type BarDatum = {
  label: string;
  value: number;
  formatted: string;
  color?: string;
};

export default function BarChart({
  data,
  height = 200,
  color = "#059669",
}: {
  data: BarDatum[];
  height?: number;
  color?: string;
}) {
  const W = 720;
  const H = height;
  const LABEL_H = 20;
  const max = Math.max(...data.map((d) => d.value), 1);
  const bw = W / Math.max(data.length, 1);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[480px]"
        role="img"
      >
        {data.map((d, i) => {
          const barH = (d.value / max) * (H - LABEL_H - 8);
          const x = i * bw + bw * 0.18;
          const w = Math.max(bw * 0.64, 6);
          const y = H - LABEL_H - barH;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={w}
                height={Math.max(barH, 2)}
                rx={4}
                fill={d.color ?? color}
              >
                <title>{`${d.label}: ${d.formatted}`}</title>
              </rect>
              <text
                x={i * bw + bw / 2}
                y={H - 6}
                textAnchor="middle"
                fontSize="11"
                fill="#94a3b8"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
