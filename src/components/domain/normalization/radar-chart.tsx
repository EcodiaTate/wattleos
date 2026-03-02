"use client";

import {
  INDICATOR_CONFIG,
  ALL_INDICATORS,
} from "@/lib/constants/normalization";

interface RadarChartProps {
  ratings: Record<string, number>;
  size?: number;
}

/**
 * SVG radar/spider chart for the five normalization indicators.
 * Pure SVG - no chart library dependency.
 */
export function RadarChart({ ratings, size = 200 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38;
  const angleStep = (2 * Math.PI) / 5;
  const startAngle = -Math.PI / 2; // Start from top

  // Grid rings (1–5)
  const rings = [1, 2, 3, 4, 5];

  // Compute polygon points for data
  const dataPoints = ALL_INDICATORS.map((ind, i) => {
    const rating = ratings[ind] ?? 0;
    const angle = startAngle + i * angleStep;
    const r = (rating / 5) * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      indicator: ind,
      angle,
    };
  });

  const polygonPath = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto"
    >
      {/* Grid rings */}
      {rings.map((ring) => {
        const r = (ring / 5) * maxR;
        const points = ALL_INDICATORS.map((_, i) => {
          const angle = startAngle + i * angleStep;
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(" ");
        return (
          <polygon
            key={ring}
            points={points}
            fill="none"
            stroke="var(--border)"
            strokeWidth={ring === 5 ? 1.5 : 0.5}
            opacity={0.5}
          />
        );
      })}

      {/* Axis lines */}
      {ALL_INDICATORS.map((_, i) => {
        const angle = startAngle + i * angleStep;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + maxR * Math.cos(angle)}
            y2={cy + maxR * Math.sin(angle)}
            stroke="var(--border)"
            strokeWidth={0.5}
            opacity={0.4}
          />
        );
      })}

      {/* Data polygon */}
      <polygon
        points={polygonPath}
        fill="var(--normalization-normalized)"
        fillOpacity={0.2}
        stroke="var(--normalization-normalized)"
        strokeWidth={2}
      />

      {/* Data points */}
      {dataPoints.map((p) => (
        <circle
          key={p.indicator}
          cx={p.x}
          cy={p.y}
          r={4}
          fill={`var(${INDICATOR_CONFIG[p.indicator].cssVar})`}
          stroke="var(--background)"
          strokeWidth={2}
        />
      ))}

      {/* Labels */}
      {ALL_INDICATORS.map((ind, i) => {
        const angle = startAngle + i * angleStep;
        const labelR = maxR + 20;
        const lx = cx + labelR * Math.cos(angle);
        const ly = cy + labelR * Math.sin(angle);
        return (
          <text
            key={ind}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--foreground)"
            fontSize={10}
            fontWeight={500}
          >
            {INDICATOR_CONFIG[ind].shortLabel}
          </text>
        );
      })}
    </svg>
  );
}
