import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const out: any = {};
  try {
    const res: any = await base44.asServiceRole.entities.DrawNight.filter({});
    out.isArray = Array.isArray(res);
    out.keys = res && typeof res === "object" ? Object.keys(res) : null;
    const list = Array.isArray(res) ? res : res?.items || [];
    out.count = list.length;
    out.dates = list.map((n: any) => n.date);
  } catch (e: any) {
    out.error = String(e?.message || e);
  }
  return Response.json(out);
});