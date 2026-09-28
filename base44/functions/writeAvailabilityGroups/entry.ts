import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Columns where each group of 8 names is written, starting at row 3.
const GROUP_COLUMNS = ["D", "G", "J", "M", "P", "S"];
const GROUP_SIZE = 8;
const START_ROW = 3;
const SHEET_ID = "1fmKv6tkG0UAE5lB9af4lJgSQFlVtC9gMZZTdYERUf2U";
const TAB_NAME = "ListOfNames";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const players: string[] = Array.isArray(body?.players) ? body.players : [];

    if (players.length === 0) {
      return Response.json({ error: "No players provided" }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    // Build the ranges to clear (so stale names from a previous week are removed)
    const clearRanges = GROUP_COLUMNS.map(
      (col) => `${TAB_NAME}!${col}${START_ROW}:${col}${START_ROW + GROUP_SIZE - 1}`
    );

    const clearRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchClear`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ranges: clearRanges }),
      }
    );
    if (!clearRes.ok) {
      const errText = await clearRes.text();
      return Response.json({ error: `Failed to clear ranges: ${errText}` }, { status: 500 });
    }

    // Build the value ranges to write — one per group column
    const data = GROUP_COLUMNS.map((col, i) => {
      const group = players.slice(i * GROUP_SIZE, i * GROUP_SIZE + GROUP_SIZE);
      // Pad to GROUP_SIZE rows so each column is the same length
      while (group.length < GROUP_SIZE) group.push("");
      const values = group.map((name) => [name]);
      return {
        range: `${TAB_NAME}!${col}${START_ROW}:${col}${START_ROW + GROUP_SIZE - 1}`,
        majorDimension: "ROWS",
        values,
      };
    });

    const writeRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ valueInputOption: "RAW", data }),
      }
    );
    if (!writeRes.ok) {
      const errText = await writeRes.text();
      return Response.json({ error: `Failed to write ranges: ${errText}` }, { status: 500 });
    }

    const written = await writeRes.json();
    const groupsWritten = Math.min(
      GROUP_COLUMNS.length,
      Math.ceil(players.length / GROUP_SIZE)
    );

    return Response.json({
      success: true,
      totalPlayers: players.length,
      groupsWritten,
      columns: GROUP_COLUMNS.slice(0, groupsWritten),
      updatedCells: written?.totalUpdatedCells ?? 0,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}