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
  color = "#171717",
}: {
  data: BarDatum[];
  height?: number;
  color?: string;
}) {
  const W = 720;
  const H = height;
  const LABEL_H = 24;
  const BASELINE_Y = H - LABEL_H;
  const max = Math.max(...data.map((d) => d.value), 1);
  const bw = W / Math.max(data.length, 1);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[480px]"
        role="img"
      >
        <line
          x1="0"
          y1={BASELINE_Y}
          x2={W}
          y2={BASELINE_Y}
          stroke="#e5e5e5"
          strokeWidth="1"
        />
        {data.map((d, i) => {
          const barH = (d.value / max) * (BASELINE_Y - 8);
          const x = i * bw + bw * 0.22;
          const w = Math.max(bw * 0.56, 6);
          const y = BASELINE_Y - barH;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={w}
                height={Math.max(barH, 2)}
                fill={d.color ?? color}
              >
                <title>{`${d.label}: ${d.formatted}`}</title>
              </rect>
              <text
                x={i * bw + bw / 2}
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
      </svg>
    </div>
  );
}
