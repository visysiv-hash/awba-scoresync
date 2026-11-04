import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { buildSchedulePdf } from "@/lib/schedulePdf";

export default function useSchedulePdfFile(data) {
  const [state, setState] = useState({ url: null, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!data) return;
    let active = true;
    setState({ url: null, error: null });
    const prepare = async () => {
      try {
        const bytes = buildSchedulePdf(data.record, data.dateLabel, data.ratings).output("arraybuffer");
        const file = new File([bytes], data.fileName, { type: "application/pdf" });
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
        if (!active) return;
        const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 3600 });
        if (!signed_url) throw new Error("No PDF link was returned.");
        if (active) setState({ url: signed_url, error: null });
      } catch (error) {
        if (active) setState({ url: null, error: error.message || "Couldn't prepare the PDF. Please try again." });
      }
    };
    prepare();
    return () => { active = false; };
  }, [data, attempt]);
  return { ...state, loading: !!data && !state.url && !state.error, retry: () => setAttempt((n) => n + 1) };
}