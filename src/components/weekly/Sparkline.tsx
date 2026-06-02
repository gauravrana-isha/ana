"use client";

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
}

export function Sparkline({ values, width = 200, height = 44 }: SparklineProps) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const lastIdx = values.length - 1;
  const lastX = ((lastIdx / (values.length - 1)) * width).toFixed(1);
  const lastY = (height - ((values[lastIdx] - min) / range) * (height - 8) - 4).toFixed(1);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-[44px] overflow-visible"
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--line-chart)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="3.5" fill="var(--line-chart)" />
    </svg>
  );
}
