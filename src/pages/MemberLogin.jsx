import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, HelpCircle, UserPlus, LogIn, ArrowLeft } from "lucide-react";
import PageBanner from "../components/PageBanner";
import { toast } from "sonner";

const REGISTRATION_URL = "https://www.revolutionise.com.au/awba/registration";

export default function MemberLogin({ onVerified }) {
  const [mode, setMode] = useState("login");
  const [memberId, setMemberId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const [recovered, setRecovered] = useState(null);

  const handleLogin = async () => {
    if (!memberId.trim()) {
      toast.error("Please enter your BV member ID.");
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("verifyMember", { memberId: memberId.trim() });
      if (res.data?.valid) {
        localStorage.setItem("awba_member", JSON.stringify(res.data.member));
        onVerified();
      } else {
        toast.error(res.data?.error || "Member ID not found.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const handleRecover = async () => {
    if (!email.trim() || !phone.trim() || !dob.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setRecovered(null);
    try {
      const res = await base44.functions.invoke("verifyMember", {
        email: email.trim(),
        phone: phone.trim(),
        dob: dob.trim(),
      });
      if (res.data?.found) {
        setRecovered(res.data);
      } else {
        toast.error(res.data?.error || "No matching member found.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <PageBanner className="h-14 mb-2" />
          <h1 className="text-2xl font-bold text-white">Member Login</h1>
          <p className="text-slate-300 text-sm mt-1">Enter your Badminton Victoria member ID to continue</p>
        </div>

        {mode === "login" ? (
          <Card className="shadow-2xl">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1">
                <Label>BV Member ID</Label>
                <Input
                  placeholder="e.g. 53528"
                  value={memberId}
                  onChange={e => setMemberId(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                />
              </div>
              <Button className="w-full" onClick={handleLogin} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                {loading ? "Checking..." : "Login"}
              </Button>

              <div className="pt-2 space-y-2 text-center">
                <button
                  onClick={() => setMode("recover")}
                  className="text-sm text-slate-600 hover:text-slate-800 flex items-center justify-center gap-1 w-full"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Forgot your member ID?
                </button>
                <button
                  onClick={() => window.open(REGISTRATION_URL, "_blank")}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 w-full"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Not a member yet? Register
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-2xl">
            <CardContent className="pt-6 space-y-4">
              {recovered ? (
                <div className="space-y-4 text-center">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-slate-600">Your BV Member ID is:</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{recovered.bv_member}</p>
                    <p className="text-sm text-slate-500 mt-1">({recovered.display_name})</p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setMemberId(recovered.bv_member);
                      setMode("login");
                      setRecovered(null);
                    }}
                  >
                    Continue to Login
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-600 text-center">
                    Enter your details to find your member ID.
                  </p>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone Number</Label>
                    <Input placeholder="0412 345 678" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Date of Birth</Label>
                    <Input placeholder="DD/MM/YYYY" value={dob} onChange={e => setDob(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={handleRecover} disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {loading ? "Searching..." : "Find My Member ID"}
                  </Button>
                </>
              )}

              <button
                onClick={() => { setMode("login"); setRecovered(null); }}
                className="text-sm text-slate-600 hover:text-slate-800 w-full text-center flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to login
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}