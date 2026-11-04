import { useEffect, useRef } from "react";
import { buildSchedulePdf } from "@/lib/schedulePdf";
import { scheduleCanvas } from "@/lib/scheduleCanvas";

export default function SchedulePdfPreview({ data }) {
  const canvas = useRef(null);
  useEffect(() => {
    buildSchedulePdf(data.record, data.dateLabel, data.ratings, scheduleCanvas(canvas.current));
  }, [data]);
  return (
    <div className="max-h-[55vh] overflow-auto rounded border border-border bg-muted p-2">
      <canvas ref={canvas} role="img" aria-label={`A4 schedule preview for ${data.dateLabel}`} className="block h-auto w-full" />
    </div>
  );
}