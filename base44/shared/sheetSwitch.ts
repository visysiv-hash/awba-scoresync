// One switch for the whole app. When the committee turns the spreadsheet off,
// every function works from the app's own records and no Google Sheets call is made,
// so the app can be checked end to end on its own data.

export const SHEET_SETTING_KEY = "spreadsheet_enabled";

export async function sheetsEnabled(base44: any): Promise<boolean> {
  try {
    const page: any = await base44.asServiceRole.entities.AppSetting.filter(
      { key: SHEET_SETTING_KEY },
      { limit: 1 }
    );
    const row = (page.items || page || [])[0];
    // No setting saved yet means the sheet is still in use, exactly as before.
    return row ? String(row.value) !== "false" : true;
  } catch {
    return true;
  }
}