import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminPinGate from "@/components/AdminPinGate";
import { getCurrentMember } from "@/lib/currentMember";
import { isAdminUnlocked } from "@/lib/adminUnlock";

/**
 * Wraps an admin page so nothing inside it is fetched or drawn until the member is
 * an admin and the PIN has been entered on this device.
 */
export default function AdminRoute({ children }) {
  const navigate = useNavigate();
  const isAdmin = getCurrentMember()?.is_admin === true;
  const [unlocked, setUnlocked] = useState(isAdminUnlocked);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 p-4 flex items-center justify-center">
        <Card className="max-w-sm w-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-lg">
              <ShieldAlert className="w-5 h-5 text-red-500" /> Admins only
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              This page is for committee members with admin access.
            </p>
            <Button className="w-full" onClick={() => navigate("/")}>
              Back to home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-slate-900">
        <AdminPinGate onSuccess={() => setUnlocked(true)} onCancel={() => navigate("/")} />
      </div>
    );
  }

  return children;
}