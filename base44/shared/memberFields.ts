// Shared field handling for member records, so adding and editing a member
// validate a phone number and date of birth the same way.

/**
 * Sanitizes a raw phone input into a bare Australian mobile number (9 digits, leading 4).
 * Returns { mobile, phone } where:
 *   mobile = bare 9-digit number
 *   phone  = "0" + mobile
 */
export function sanitizeAustralianMobile(raw: string): { mobile: string; phone: string } | null {
  if (!raw) return null;
  let s = String(raw).replace(/[\s()\-\+]/g, "");

  if (s.startsWith("61")) s = s.slice(2);
  s = s.replace(/^0+/, "");

  if (!/^4\d{8}$/.test(s)) return null;
  return { mobile: s, phone: "0" + s };
}

export function normalizeDateOfBirth(s: string): string {
  if (!s) return "";
  const str = String(s).trim();
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}`;
  const m2 = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m2) return `${m2[3].padStart(2, "0")}/${m2[2].padStart(2, "0")}/${m2[1]}`;
  return str;
}