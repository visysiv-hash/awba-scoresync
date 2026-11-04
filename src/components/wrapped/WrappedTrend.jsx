import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function WrappedTrend({ trend = [], rating }) {
  const points = trend.filter((p) => p.rating != null);
  if (points.length < 2) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
        <p className="text-sm font-bold text-white">Rating trend</p>
        <p className="mt-2 text-xs text-slate-400">
          Play another night and your rating line appears here.
        </p>
      </div>
    );
  }

  const values = points.map((p) => p.rating);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const pad = Math.max(0.15, (high - low) * 0.2);

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-bold text-white">Rating trend</p>
        <p className="text-[11px] text-slate-400">
          {points[0].rating.toFixed(2)} → {points[points.length - 1].rating.toFixed(2)}
        </p>
      </div>
      <div className="mt-2 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              domain={[low - pad, high + pad]}
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => Number(v).toFixed(1)}
            />
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 10, fontSize: 12 }}
              labelStyle={{ color: "#e2e8f0" }}
              formatter={(v) => [Number(v).toFixed(2), "Rating"]}
            />
            <Line
              type="monotone"
              dataKey="rating"
              stroke="#facc15"
              strokeWidth={2.5}
              dot={{ r: 2, fill: "#facc15" }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {rating?.start != null && rating?.now != null && (
        <p className="mt-1 text-[11px] text-slate-400">
          Started the season at {rating.start.toFixed(2)}
        </p>
      )}
    </div>
  );
}