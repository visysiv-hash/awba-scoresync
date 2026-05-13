import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

/**
 * Renders a PIN prompt. Calls onSuccess() when the correct PIN is entered.
 * Calls onCancel() when the user dismisses.
 */
export default function AdminPinGate({ onSuccess, onCancel }) {
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPinLoading(true);
    setPinError(false);
    const res = await base44.functions.invoke("verifyAdminPin", { pin });
    setPinLoading(false);
    if (res.data?.success) {
      onSuccess();
    } else {
      setPinError(true);
      setPin("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="max-w-sm w-full">
        <CardHeader>
          <CardTitle className="text-center text-lg">🔒 Admin Access</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">Enter the admin PIN to continue</p>
            <input
              type="password"
              inputMode="numeric"
              className={`w-full h-10 rounded-md border px-3 py-2 text-sm text-center tracking-widest text-lg focus:outline-none focus:ring-1 focus:ring-ring ${
                pinError ? "border-red-500 bg-red-50" : "border-input"
              }`}
              placeholder="••••"
              value={pin}
              onChange={e => { setPin(e.target.value); setPinError(false); }}
              autoFocus
            />
            {pinError && <p className="text-red-500 text-xs text-center">Incorrect PIN. Try again.</p>}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={pinLoading || !pin}>
                {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}