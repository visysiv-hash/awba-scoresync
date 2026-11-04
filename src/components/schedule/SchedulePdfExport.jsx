import { useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import SchedulePdfDialog from "@/components/schedule/SchedulePdfDialog";

export default function SchedulePdfExport({ record, date, dateLabel, ratings }) {
  const [data, setData] = useState(null);
  return (
    <>
      <Button size="sm" variant="secondary" disabled={!record} onClick={() => setData({ record, ratings, dateLabel, fileName: `AWBA_Schedule_${date}.pdf` })}>
        <FileDown className="mr-1 h-3.5 w-3.5" />PDF
      </Button>
      <SchedulePdfDialog data={data} onClose={() => setData(null)} />
    </>
  );
}