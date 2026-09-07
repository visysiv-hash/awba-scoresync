import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import AdminPinGate from "../components/AdminPinGate";
import PageBanner from "../components/PageBanner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";

export default function AdminMembers() {
  const [pinUnlocked, setPinUnlocked] = useState(() => sessionStorage.getItem("adminPinUnlocked") === "true");
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [payingRow, setPayingRow] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getMemberData", {});
      setHeaders(res.data?.headers || []);
      setRows(res.data?.rows || []);
    } catch (e) {
      toast.error("Failed to load member data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (pinUnlocked) loadData(); }, [pinUnlocked]);

  const handleMarkPaid = async (rowNumber, idx) => {
    setPayingRow(rowNumber);
    try {
      await base44.functions.invoke("markMemberPaid", { row_number: rowNumber });
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, paid: "Paid", cells: r.cells.map((c, ci) => ci === r.cells.length - 1 ? "Paid" : c) } : r));
      toast.success("Marked as paid.");
    } catch (e) {
      toast.error("Failed to mark paid.");
    } finally {
      setPayingRow(null);
    }
  };

  if (!pinUnlocked) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700">
      <AdminPinGate
        onSuccess={() => { setPinUnlocked(true); loadData(); }}
        onCancel={() => window.history.back()}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6 pt-2">
          <PageBanner className="h-14 mb-2" />
          <h1 className="text-2xl font-bold text-white">Member List</h1>
        </div>

        <div className="flex justify-between items-center mb-4">
          <Badge variant="outline" className="text-white border-white/30 bg-white/10">{rows.length} members</Badge>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>
        ) : rows.length === 0 ? (
          <Card><CardContent className="pt-6 text-center text-muted-foreground">No members found.</CardContent></Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/20 bg-white shadow-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 border-b whitespace-nowrap">#</th>
                  {headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left font-semibold text-slate-700 border-b whitespace-nowrap">{h || `Col ${i + 1}`}</th>
                  ))}
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 border-b whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.row_number} className={i % 2 ? "bg-slate-50" : "bg-white"}>
                    <td className="px-3 py-2 text-slate-400 border-b">{i + 1}</td>
                    {r.cells.map((c, ci) => {
                      const isPaidCol = ci === r.cells.length - 1;
                      return (
                        <td key={ci} className="px-3 py-2 border-b whitespace-nowrap text-slate-700">
                          {isPaidCol && c ? (
                            <Badge className="bg-green-100 text-green-700 border border-green-300">{c}</Badge>
                          ) : (c || <span className="text-slate-300">—</span>)}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 border-b whitespace-nowrap">
                      {r.paid ? (
                        <Badge className="bg-green-600 text-white">✓ Paid</Badge>
                      ) : (
                        <Button size="sm" disabled={payingRow === r.row_number} onClick={() => handleMarkPaid(r.row_number, i)}>
                          {payingRow === r.row_number ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          Mark paid
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}