import { clearEvents, formatEvents, getEvents, logEvent, onEventsChange } from '../src/audio/diagnostics';

describe('playback diagnostics log', () => {
  beforeEach(clearEvents);

  it('records events in order and notifies listeners', () => {
    const listener = jest.fn();
    const off = onEventsChange(listener);
    logEvent('play requested');
    logEvent('os: interruption began');
    expect(getEvents().map((e) => e.message)).toEqual(['play requested', 'os: interruption began']);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(formatEvents()).toMatch(/play requested\n.*interruption began/);
    off();
  });

  it('keeps only the most recent entries', () => {
    for (let i = 0; i < 400; i++) logEvent(`e${i}`);
    const events = getEvents();
    expect(events.length).toBe(150);
    expect(events[events.length - 1].message).toBe('e399');
  });
});
