import { useQuery } from "@tanstack/react-query";
import { memberDobs } from "@/lib/memberDob";
import { unsafeJuniorMatches } from "@/lib/juniorSafety";

export default function useJuniorScheduleProtection(record) {
  const names = [...new Set((record?.groups || []).flatMap((g) => g.players || []))].sort();
  const query = useQuery({
    queryKey: ["schedule-junior-details", record?.date, names],
    queryFn: () => memberDobs(record.date, names),
    enabled: !!record,
    retry: false,
  });
  const invalid = record && query.data ? unsafeJuniorMatches(record, query.data) : [];
  const assertSafe = (candidate) => {
    if (!query.data) throw new Error(query.error?.message || "Wait for the junior check to finish.");
    if (unsafeJuniorMatches(candidate, query.data).length) {
      throw new Error("This would mix juniors and adults. Use Re-pair and save to separate them.");
    }
  };
  return { loading: query.isPending, error: query.error, invalid, assertSafe };
}