// Format a YYYY-MM-DD date string as dd/mm/yyyy (Australian format).
// Returns the input unchanged if it doesn't match the expected pattern.
export const formatAusDate = (dateStr) => {
  if (!dateStr) return "";
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return dateStr;
  return `${m[3]}/${m[2]}/${m[1]}`;
};