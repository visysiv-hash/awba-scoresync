import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const DOW = ["M", "T", "W", "T", "F", "S", "S"];

export default function SessionCalendar({ sessions, selectedIds, toggleDay, myBooking, confirmedCount }) {
  // Start on the first session's month, or current month
  const firstDate = sessions.length > 0 ? sessions[0].date : new Date().toISOString().split("T")[0];
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(firstDate + "T00:00:00");
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Map date -> sessions
  const sessionsByDate = useMemo(() => {
    const map = {};
    for (const s of sessions) {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    }
    return map;
  }, [sessions]);

  const todayStr = new Date().toISOString().split("T")[0];

  const grid = useMemo(() => {
    const first = new Date(viewMonth.year, viewMonth.month, 1);
    const startDay = (first.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, dateStr, sessions: sessionsByDate[dateStr] || [] });
    }
    return cells;
  }, [viewMonth, sessionsByDate]);

  const canPrev = (() => {
    const m = new Date(viewMonth.year, viewMonth.month, 1);
    const t = new Date(todayStr + "T00:00:00");
    return m > t;
  })();

  const goPrev = () => setViewMonth(p => {
    const m = p.month - 1;
    return m < 0 ? { year: p.year - 1, month: 11 } : { ...p, month: m };
  });
  const goNext = () => setViewMonth(p => {
    const m = p.month + 1;
    return m > 11 ? { year: p.year + 1, month: 0 } : { ...p, month: m };
  });

  return (
    <div className="bg-white rounded-xl shadow-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!canPrev} onClick={goPrev}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="font-bold text-sm">{MONTHS[viewMonth.month]} {viewMonth.year}</span>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={goNext}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((cell, i) => {
          if (!cell) return <div key={i} />;
          const isPast = cell.dateStr < todayStr;
          const hasSessions = cell.sessions.length > 0;
          const selectable = cell.sessions.filter(s => !myBooking(s.id));
          const allSelected = selectable.length > 0 && selectable.every(s => selectedIds.has(s.id));
          const someSelected = selectable.some(s => selectedIds.has(s.id));
          const totalLeft = cell.sessions.reduce((sum, s) => sum + Math.max(0, s.max_spots - confirmedCount(s.id)), 0);

          return (
            <button
              key={i}
              disabled={!hasSessions || isPast || selectable.length === 0}
              onClick={() => selectable.length > 0 && toggleDay(cell.sessions)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative transition-all ${
                !hasSessions || isPast
                  ? "text-muted-foreground/40 cursor-default"
                  : allSelected
                    ? "bg-teal-500 text-white font-bold"
                    : someSelected
                      ? "bg-teal-100 text-teal-800 font-semibold border border-teal-400"
                      : "bg-slate-50 hover:bg-teal-50 border border-slate-200 text-slate-700"
              }`}
            >
              <span>{cell.day}</span>
              {hasSessions && !isPast && (
                <span className="flex gap-0.5 mt-0.5">
                  {cell.sessions.slice(0, 3).map((s, idx) => (
                    <span key={idx} className={`w-1 h-1 rounded-full ${myBooking(s.id) ? "bg-blue-600" : allSelected ? "bg-white" : "bg-teal-500"}`} />
                  ))}
                </span>
              )}
              {hasSessions && !isPast && totalLeft <= 0 && (
                <span className="absolute top-0 right-0.5 text-[8px] text-red-500 font-bold">F</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground border-t pt-2">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500" /> Available</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600" /> You're booked</span>
        <span className="flex items-center gap-1"><span className="text-red-500 font-bold text-[10px]">F</span> Full</span>
      </div>
    </div>
  );
}