import { base44 } from "@/api/base44Client";

// Base group = the group a player's rating starts from. Stored in the app so a
// wrong starting group can be corrected with no spreadsheet involved.
export const BASE_GROUPS = [1, 2, 3, 4, 5, 6];

export async function saveBaseGroup(player, value) {
  const key = `base_group:${String(player).trim().toLowerCase()}`;
  const found = await base44.entities.AppSetting.filter({ key }, { limit: 1 });
  const existing = (found.items || [])[0];
  if (!value) {
    if (existing) await base44.entities.AppSetting.delete(existing.id);
    return;
  }
  if (existing) await base44.entities.AppSetting.update(existing.id, { value: String(value) });
  else await base44.entities.AppSetting.create({ key, value: String(value) });
}