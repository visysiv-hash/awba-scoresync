import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarX } from "lucide-react";

/**
 * Shown after a booking is cancelled. The app cannot reach a calendar invite the
 * player may already have saved, so they need to remove it themselves.
 */
export default function CalendarReminderDialog({ open, onClose }) {
  if (!open) return null;

  return (
    <AlertDialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CalendarX className="w-5 h-5 text-teal-600" />
            Booking cancelled
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-700">
            If you saved this session to your calendar, delete that event too.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>Got it</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}