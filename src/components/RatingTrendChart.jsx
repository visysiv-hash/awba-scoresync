import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";

export default function RatingTrendChart({ rounds, overallRating, groupBase }) {
  if (!rounds || rounds.length < 2) return null;

  const data = rounds.map((r, i) => ({
    name: `R${r.round}`,
    rating: r.sessionRating,
    group: r.group,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      const improving = val < overallRating;
      return (
        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow">
          <p className="font-bold text-slate-700">{label}</p>
          <p className={`font-semibold ${improving ? "text-green-600" : "text-red-500"}`}>
            Rating: {val}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mt-3 bg-white border border-blue-100 rounded-lg p-3">
      <p className="text-xs font-semibold text-slate-500 mb-2">Rating Trend <span className="text-slate-400 font-normal">(lower = stronger)</span></p>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            domain={["auto", "auto"]}
            reversed={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={overallRating}
            stroke="#f59e0b"
            strokeDasharray="4 3"
            label={{ value: `avg ${overallRating}`, position: "insideTopRight", fontSize: 9, fill: "#f59e0b" }}
          />
          <Line
            type="monotone"
            dataKey="rating"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3, fill: "#3b82f6" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}