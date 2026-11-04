// Shows the generated schedule PDF inside the app first. A browser download is
// often blocked inside the editor preview (and some phone browsers cannot render
// a PDF inline), so there is always an Open and a Download link to fall back on.
import { Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SchedulePdfDialog({ open, url, fileName, onClose }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl p-4">
        <DialogHeader>
          <DialogTitle className="text-sm">Schedule PDF</DialogTitle>
        </DialogHeader>
        {url && (
          <>
            <iframe
              src={url}
              title="Schedule PDF"
              className="w-full h-[55vh] rounded-lg border border-slate-200 bg-white"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" asChild>
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open
                </a>
              </Button>
              <Button size="sm" asChild>
                <a href={url} download={fileName}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Download
                </a>
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}