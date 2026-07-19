/**
 * Converts the internal cycle ID format (e.g. "Jul-26") to a human-friendly
 * label (e.g. "July 2026"). Falls back to the raw string if the format is
 * unrecognized.
 */

const MONTH_MAP: Record<string, string> = {
  jan: "January",
  feb: "February",
  mar: "March",
  apr: "April",
  may: "May",
  jun: "June",
  jul: "July",
  aug: "August",
  sep: "September",
  oct: "October",
  nov: "November",
  dec: "December",
};

export function formatCycleLabel(cycleId: string): string {
  if (!cycleId) return cycleId;
  const parts = cycleId.split("-");
  if (parts.length !== 2) return cycleId;
  const month = MONTH_MAP[parts[0].toLowerCase()];
  const year = parts[1].length === 2 ? `20${parts[1]}` : parts[1];
  return month ? `${month} ${year}` : cycleId;
}
