import React from 'react';
export function Bitmap({
  rows,
  scale = 3,
}: {
  rows: readonly string[];
  scale?: number;
}) {
  let path = '';
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] !== '1') {
        x++;
        continue;
      }
      const start = x;
      while (row[x] === '1') x++;
      path += `M${start} ${y}h${x - start}v1h-${x - start}z`;
    }
  });
  return (
    <svg
      width={(rows[0]?.length ?? 0) * scale}
      height={rows.length * scale}
      viewBox={`0 0 ${rows[0]?.length ?? 0} ${rows.length}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <path fill="currentColor" d={path} />
    </svg>
  );
}
