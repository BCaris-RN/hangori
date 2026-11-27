export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 24 * HOUR_MS;

/**
 * Renders a wait as plain words, for example "2h 10m". Rounds up to the next
 * whole minute so a wait is never shown shorter than it is.
 */
export function formatWait(ms: number): string {
  if (ms <= 0) return "now";
  const totalMinutes = Math.ceil(ms / MINUTE_MS);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 && days === 0) parts.push(`${minutes}m`);
  return parts.join(" ");
}
