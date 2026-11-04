import { scheduleUniqueness, uniquenessMessage } from "@/lib/scheduleUniqueness";

export default function UniqueGamesStatus({ record, info }) {
  if (!info && !record?.matches?.length) return null;
  const result = info || scheduleUniqueness(record);
  const warning = result.partners || result.opponents || result.meetings;
  return (
    <p role="status" className={`no-print text-xs rounded-lg border px-3 py-2 ${warning ? "border-destructive/40 text-destructive bg-destructive/10" : "border-current/20 text-inherit"}`}>
      {uniquenessMessage(result)}
    </p>
  );
}