'use client';

interface SparklineProps {
  data: number[];
  color?: string;
  className?: string;
}

export function Sparkline({
  data,
  color = '#60a5fa',
  className = '',
}: SparklineProps) {
  if (!data || data.length < 2) {
    return null;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Normalize data to 0-100 range for viewBox
  const points = data.map((value, index) => ({
    x: (index / (data.length - 1)) * 100,
    y: 100 - ((value - min) / range) * 100,
  }));

  // Create smooth monotonic curve that doesn't overshoot
  const createSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return '';

    let path = `M ${pts[0].x} ${pts[0].y}`;

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];

      // Simple smooth curve: horizontal control points (no vertical overshoot)
      const midX = (p1.x + p2.x) / 2;
      path += ` C ${midX} ${p1.y}, ${midX} ${p2.y}, ${p2.x} ${p2.y}`;
    }

    return path;
  };

  const linePath = createSmoothPath(points);
  // Create filled area path (line + bottom edge)
  const areaPath = `${linePath} L 100 100 L 0 100 Z`;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`absolute inset-0 w-full h-full ${className}`}
    >
      {/* Filled area under the curve */}
      <path
        d={areaPath}
        fill={color}
        fillOpacity="0.15"
      />
      {/* The line itself */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
