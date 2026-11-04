import { Download, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SchedulePdfPreview from "@/components/schedule/SchedulePdfPreview";
import useSchedulePdfFile from "@/components/schedule/useSchedulePdfFile";

export default function SchedulePdfDialog({ data, onClose }) {
  const { url, loading, error, retry } = useSchedulePdfFile(data);
  return (
    <Dialog open={!!data} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="no-print w-[calc(100%-2rem)] max-w-3xl max-h-[90dvh] overflow-y-auto p-4 text-foreground">
        <DialogHeader>
          <DialogTitle className="text-sm">Schedule PDF</DialogTitle>
          <DialogDescription>Single-page A4 preview. Open the PDF to save or print it.</DialogDescription>
        </DialogHeader>
        {data && <SchedulePdfPreview data={data} />}
        {loading && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Preparing PDF link…</p>}
        {error && (
          <div role="alert" className="space-y-2 text-sm text-destructive">
            <p>{error}</p>
            <Button size="sm" variant="outline" onClick={retry}>Try again</Button>
          </div>
        )}
        {url && (
          <>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" />Open PDF</a>
              </Button>
              <Button size="sm" asChild>
                <a href={url} download={data.fileName} target="_blank" rel="noopener noreferrer"><Download className="h-3.5 w-3.5" />Download PDF</a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">If the PDF opens in a new tab, use its Save or Download option. This link expires in one hour.</p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}