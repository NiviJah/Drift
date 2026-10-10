/**
 * In-memory ring buffer of playback events (play/pause requests, OS interruptions,
 * media-button commands, engine errors). Shown in Settings → Playback diagnostics so
 * device-specific problems (Bluetooth, car head units, OEM audio quirks) can be reported.
 */

export interface DiagnosticEntry {
  at: number;
  message: string;
}

const MAX_ENTRIES = 150;
const entries: DiagnosticEntry[] = [];
const listeners = new Set<() => void>();

export function logEvent(message: string): void {
  entries.push({ at: Date.now(), message });
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
  listeners.forEach((l) => l());
}

export function getEvents(): readonly DiagnosticEntry[] {
  return entries;
}

export function onEventsChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearEvents(): void {
  entries.length = 0;
  listeners.forEach((l) => l());
}

export function formatEvents(): string {
  return entries
    .map((e) => `${new Date(e.at).toISOString().slice(11, 23)}  ${e.message}`)
    .join('\n');
}

export function describeError(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return String(e);
}
