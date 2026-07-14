import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import PageBanner from "../components/PageBanner";

export default function Register() {
  const [season, setSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "",
    player_type: "", skill_group: ""
  });

  useEffect(() => {
    base44.entities.Season.filter({ registration_open: true }, "-created_date", 1)
      .then(seasons => setSeason(seasons[0] || null))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!form.full_name || !form.phone || !form.email || !form.player_type || !form.skill_group) {
      toast.error("Please fill in all fields.");
      return;
    }
    setSubmitting(true);
    await base44.entities.Registration.create({
      ...form,
      status: "pending",
      payment_status: "unpaid",
      season_id: season?.id || ""
    });
    setSubmitted(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!season) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <p className="text-2xl font-bold mb-2">Registration Closed</p>
          <p className="text-slate-300">There are no open registration seasons at this time. Check back soon!</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-4">
        <div className="text-center text-white space-y-4 max-w-sm">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
          <h2 className="text-2xl font-bold">Registration Submitted!</h2>
          <p className="text-slate-300">Thanks {form.full_name}! We'll review your registration and be in touch soon.</p>
          {season.fee && (
            <Card className="text-left mt-4">
              <CardContent className="pt-4 space-y-2 text-sm">
                <p className="font-bold text-slate-800">💳 Payment Details</p>
                <p className="text-slate-600">Fee: <span className="font-semibold">${season.fee} AUD</span></p>
                {season.bank_name && <p className="text-slate-600">Bank: {season.bank_name}</p>}
                {season.bsb && <p className="text-slate-600">BSB: {season.bsb}</p>}
                {season.account_number && <p className="text-slate-600">Account: {season.account_number}</p>}
                {season.account_name && <p className="text-slate-600">Name: {season.account_name}</p>}
                {season.payment_reference_instructions && (
                  <p className="text-slate-600">Reference: {season.payment_reference_instructions}</p>
                )}
                {season.notes && <p className="text-slate-500 text-xs mt-2">{season.notes}</p>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <PageBanner className="h-14 mb-2" />
          <h1 className="text-2xl font-bold text-white">Register for {season.name}</h1>
          {season.fee && <p className="text-slate-300 text-sm mt-1">Registration fee: ${season.fee} AUD</p>}
          {season.start_date && <p className="text-slate-400 text-xs mt-1">Season starts {season.start_date}</p>}
        </div>

        <Card className="shadow-2xl">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input placeholder="Your full name" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input placeholder="0400 000 000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>New or Returning Player?</Label>
              <Select value={form.player_type} onValueChange={v => setForm(f => ({ ...f, player_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New Player</SelectItem>
                  <SelectItem value="returning">Returning Player</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Skill Group Preference</Label>
              <Select value={form.skill_group} onValueChange={v => setForm(f => ({ ...f, skill_group: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {["1","2","3","4","5","6"].map(g => (
                    <SelectItem key={g} value={g}>Group {g}</SelectItem>
                  ))}
                  <SelectItem value="unsure">Not sure</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {submitting ? "Submitting..." : "Submit Registration"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}