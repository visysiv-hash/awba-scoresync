// Format a YYYY-MM-DD date string as dd/mm/yyyy (Australian format).
// Returns the input unchanged if it doesn't match the expected pattern.
export const formatAusDate = (dateStr) => {
  if (!dateStr) return "";
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return dateStr;
  return `${m[3]}/${m[2]}/${m[1]}`;
};

// Format a YYYY-MM-DD date string as "Day dd/mm/yyyy" (e.g. "Tue 06/10/2026").
export const formatAusDateWithDay = (dateStr) => {
  if (!dateStr) return "";
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return dateStr;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const day = d.toLocaleDateString("en-AU", { weekday: "short" });
  return `${day} ${m[3]}/${m[2]}/${m[1]}`;
};