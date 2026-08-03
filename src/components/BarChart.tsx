"use client";

export function BarChart({
  data,
  height = 140,
  color = "#f97316",
  valueSuffix = "",
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  valueSuffix?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d, i) => (
          <div
            key={i}
            className="group relative flex-1 rounded-t-md transition-all"
            style={{
              height: `${Math.max((d.value / max) * 100, 2)}%`,
              backgroundColor: d.value > 0 ? color : "rgba(148,163,184,0.25)",
            }}
          >
            <div className="pointer-events-none absolute -top-6 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white group-hover:block">
              {d.label}: {d.value}
              {valueSuffix}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 truncate text-center text-[9px] text-slate-400">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
