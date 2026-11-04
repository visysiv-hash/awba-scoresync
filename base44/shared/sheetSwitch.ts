// One switch for the whole app. When the committee turns the spreadsheet off,
// every function works from the app's own records and no Google Sheets call is made,
// so the app can be checked end to end on its own data.

export const SHEET_SETTING_KEY = "spreadsheet_enabled";

export async function sheetsEnabled(base44: any): Promise<boolean> {
  try {
    // The plain query form works across SDK versions; the records come back as a
    // list or a page, so both shapes are read.
    const found: any = await base44.asServiceRole.entities.AppSetting.filter({ key: SHEET_SETTING_KEY });
    const list = Array.isArray(found) ? found : found?.items || [];
    const row = list.find((r: any) => r && r.key === SHEET_SETTING_KEY) || list[0];
    // No setting saved yet means the sheet is still in use, exactly as before.
    return row ? String(row.value) !== "false" : true;
  } catch {
    return true;
  }
}