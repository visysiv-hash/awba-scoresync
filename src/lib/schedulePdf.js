// Builds the night's schedule as a real A4 PDF (vectors, not a screenshot), so a
// phone produces the same single page a laptop would: nets two-up, three games
// per net with pair averages, and an alphabetical player-to-net list underneath.
import { jsPDF } from "jspdf";
import { pairAverage } from "@/lib/appRatingMap";

const PAGE = { w: 210, h: 297, m: 8 };
const BLOCK_FILL = [254, 215, 170];
const HEAD_FILL = [253, 186, 116];

const pairLabel = (team, ratings) => {
  const names = (team || []).filter(Boolean);
  if (!names.length) return "—";
  const avg = pairAverage(names, ratings);
  return avg === null ? names.join(" & ") : names.join(" & ") + "  " + avg.toFixed(2);
};

// Shrinks text until it fits the cell, so long names never spill over a border.
const fit = (doc, text, maxWidth, size) => {
  let s = size;
  doc.setFontSize(s);
  while (s > 5.5 && doc.getTextWidth(text) > maxWidth) {
    s -= 0.25;
    doc.setFontSize(s);
  }
  return s;
};

const teamsOf = (match, key) => (match && Array.isArray(match[key]) ? match[key] : []);

const drawNet = (doc, x, y, w, net, matches, ratings) => {
  const headH = 7;
  const rowH = 6.6;
  const h = headH + rowH * 3;
  const gameW = 5;
  const vsW = 6;
  const teamW = (w - gameW - vsW - 3) / 2;

  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.setFillColor(BLOCK_FILL[0], BLOCK_FILL[1], BLOCK_FILL[2]);
  doc.rect(x, y, w, h, "FD");
  doc.setFillColor(HEAD_FILL[0], HEAD_FILL[1], HEAD_FILL[2]);
  doc.rect(x, y, w, headH, "FD");

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  doc.text("NET NUMBER", x + w / 2, y + 2.8, { align: "center" });
  doc.setFontSize(10);
  doc.text(String(net), x + w / 2, y + 6.5, { align: "center" });

  for (let g = 1; g <= 3; g++) {
    const ry = y + headH + (g - 1) * rowH;
    const base = ry + rowH / 2 + 2.2;
    doc.setDrawColor(0);
    doc.setLineWidth(0.15);
    doc.line(x, ry, x + w, ry);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(String(g), x + gameW / 2, base, { align: "center" });

    const match = matches.find((m) => Number(m.net) === net && Number(m.game) === g);
    // Both pairs start at the left edge of their cell, so neither can reach the "vs" rule.
    const pad = 1.5;
    const maxW = teamW - pad * 2;
    const x1 = x + gameW + pad;
    const x2 = x + gameW + teamW + vsW + pad;
    const t1 = pairLabel(teamsOf(match, "team1"), ratings);
    const t2 = pairLabel(teamsOf(match, "team2"), ratings);

    doc.setFont("helvetica", "normal");
    fit(doc, t1, maxW, 7);
    doc.text(t1, x1, base, { align: "left" });
    fit(doc, t2, maxW, 7);
    doc.text(t2, x2, base, { align: "left" });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(190, 25, 25);
    doc.text("vs", x + gameW + teamW + vsW / 2 + 0.75, base, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  doc.setDrawColor(0);
  doc.setLineWidth(0.15);
  [gameW, gameW + teamW, gameW + teamW + vsW].forEach((dx) => {
    doc.line(x + dx, y + headH, x + dx, y + h);
  });
  return h;
};

// Alphabetical player list with the nets each player is on, in columns.
const drawPlayerNets = (doc, x, y, w, matches) => {
  const byPlayer = new Map();
  matches.forEach((m) => {
    [...teamsOf(m, "team1"), ...teamsOf(m, "team2")].forEach((name) => {
      if (!name) return;
      if (!byPlayer.has(name)) byPlayer.set(name, new Set());
      byPlayer.get(name).add(Number(m.net));
    });
  });
  const players = [...byPlayer.entries()]
    .map((entry) => ({
      name: entry[0],
      nets: [...entry[1]].filter(Number.isFinite).sort((a, b) => a - b),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (!players.length) return;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("PLAYERS & NETS", x, y);
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(x, y + 1.5, x + w, y + 1.5);

  const cols = 3;
  const colW = w / cols;
  const perCol = Math.ceil(players.length / cols);
  const rowH = 4.6;

  players.forEach((p, i) => {
    const col = Math.floor(i / perCol);
    const row = i % perCol;
    const px = x + col * colW;
    const py = y + 6 + row * rowH;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(p.name, px, py);
    doc.setFont("helvetica", "bold");
    doc.text(p.nets.length ? p.nets.join(", ") : "—", px + colW - 3, py, { align: "right" });
  });
};

export function buildSchedulePdf(record, dateLabel, ratings = {}, surface = null) {
  const doc = surface || new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const matches = (record && record.matches) || [];
  const m = PAGE.m;

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const parts = ["SCHEDULE"];
  if (record && record.title) parts.push(record.title);
  if (record && record.time_label) parts.push("(" + record.time_label + ")");
  doc.text(parts.join(" - "), m, 12);
  doc.setFontSize(10);
  doc.text(String(dateLabel || ""), PAGE.w - m, 12, { align: "right" });

  const nets = [...new Set(matches.map((mm) => Number(mm.net)))]
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  const gap = 4;
  const colW = (PAGE.w - m * 2 - gap) / 2;
  const blockH = 7 + 6.6 * 3;
  const step = blockH + 2.5;
  const top = 18;

  nets.forEach((net, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    drawNet(doc, m + col * (colW + gap), top + row * step, colW, net, matches, ratings);
  });

  const rows = Math.ceil(nets.length / 2);
  drawPlayerNets(doc, m, top + rows * step + 6, PAGE.w - m * 2, matches);

  return doc;
}