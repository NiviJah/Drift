import { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { fadeLevel, formatClock, formatDuration } from '../../audio/math';
import { ProgressRing } from '../../components/ProgressRing';
import { Screen } from '../../components/Screen';
import { Button, Card, Chip, Icon, IconButton, SectionHeader } from '../../components/ui';
import { haptic } from '../../haptics';
import { useNow } from '../../hooks/useNow';
import { useStore } from '../../state/store';
import { colors, radius, spacing, type } from '../../theme';

const DURATIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 360, 480];
/** Fade-out lengths in minutes; -1 means "fade across the entire timer". */
const FADES = [0, 1, 5, 10, 15, 30, -1];
const MAX_MINUTES = 12 * 60;

function fadeLabel(f: number): string {
  if (f === 0) return 'Off';
  if (f === -1) return 'Entire timer';
  return `${f} min`;
}

function endTimeLabel(endsAt: number): string {
  return new Date(endsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function TimerScreen() {
  const { width } = useWindowDimensions();
  const { timer, timerPrefs, hasMix, startTimer, extendTimer, cancelTimer } = useStore(
    useShallow((s) => ({
      timer: s.timer,
      timerPrefs: s.timerPrefs,
      hasMix: Object.keys(s.mix).length > 0,
      startTimer: s.startTimer,
      extendTimer: s.extendTimer,
      cancelTimer: s.cancelTimer,
    })),
  );
  const [minutes, setMinutes] = useState(timerPrefs.minutes);
  const [fade, setFade] = useState(timerPrefs.fadeMinutes === timerPrefs.minutes ? -1 : timerPrefs.fadeMinutes);
  const now = useNow(true, timer ? 500 : 15_000);
  const ringSize = Math.min(width - spacing.lg * 2, 280);

  const effectiveFade = fade === -1 ? minutes : Math.min(fade, minutes);

  if (timer) {
    const remaining = Math.max(0, timer.endsAt - now);
    const elapsed = timer.durationMs - remaining;
    const fadeStartsIn = remaining - timer.fadeMs;
    const fading = timer.fadeMs > 0 && fadeStartsIn <= 0;
    const level = fading ? fadeLevel(1 - remaining / timer.fadeMs) : 1;
    return (
      <Screen title="Sleep Timer" subtitle={`Playback stops at ${endTimeLabel(timer.endsAt)}`}>
        <View style={styles.ringWrap}>
          <ProgressRing size={ringSize} progress={1 - elapsed / timer.durationMs}>
            <Text style={[styles.clock, type.mono]} accessibilityLabel={`${formatClock(remaining)} remaining`}>
              {formatClock(remaining)}
            </Text>
            <Text style={type.caption}>remaining</Text>
          </ProgressRing>
        </View>

        <Card style={styles.statusCard}>
          <Icon name={fading ? 'volume-low' : timer.fadeMs > 0 ? 'volume-medium' : 'stop-circle-outline'} size={22} color={colors.accent} />
          <Text style={[type.body, { flex: 1 }]}>
            {timer.fadeMs === 0
              ? 'Sound stops when the timer ends.'
              : fading
                ? `Fading out gently · ${Math.round(level * 100)}% volume`
                : `Gentle fade-out begins in ${formatClock(fadeStartsIn)}`}
          </Text>
        </Card>

        <SectionHeader title="Need more time?" />
        <View style={styles.row}>
          {[5, 15, 30].map((m) => (
            <Button
              key={m}
              compact
              variant="secondary"
              icon="plus"
              label={`${m} min`}
              onPress={() => extendTimer(m)}
              style={{ flex: 1 }}
            />
          ))}
        </View>
        <Button
          variant="danger"
          icon="close"
          label="Cancel timer"
          onPress={() => {
            cancelTimer();
            haptic.success();
          }}
          style={{ marginTop: spacing.xl }}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Sleep Timer" subtitle="Drift off — the sound fades away on its own.">
      <View style={styles.ringWrap}>
        <ProgressRing size={ringSize} progress={minutes / MAX_MINUTES}>
          <View style={styles.stepper}>
            <IconButton
              icon="minus"
              label="Five minutes less"
              filled
              onPress={() => setMinutes((m) => Math.max(5, m - 5))}
            />
            <View style={{ alignItems: 'center', minWidth: 110 }}>
              <Text style={[styles.clock, { fontSize: 34 }]}>{formatDuration(minutes)}</Text>
              <Text style={type.caption}>ends ≈ {endTimeLabel(now + minutes * 60_000)}</Text>
            </View>
            <IconButton
              icon="plus"
              label="Five minutes more"
              filled
              onPress={() => setMinutes((m) => Math.min(MAX_MINUTES, m + 5))}
            />
          </View>
        </ProgressRing>
      </View>

      <SectionHeader title="Duration" />
      <View style={styles.wrap}>
        {DURATIONS.map((d) => (
          <Chip key={d} label={formatDuration(d)} selected={minutes === d} onPress={() => setMinutes(d)} />
        ))}
      </View>

      <SectionHeader title="Fade out" />
      <View style={styles.wrap}>
        {FADES.map((f) => (
          <Chip key={f} label={fadeLabel(f)} selected={fade === f} onPress={() => setFade(f)} />
        ))}
      </View>
      <Text style={[type.caption, { marginTop: spacing.md }]}>
        {effectiveFade === 0
          ? 'Sound stops immediately when the timer ends.'
          : effectiveFade === minutes
            ? `Volume lowers little by little across the full ${formatDuration(minutes)}, reaching silence at the end.`
            : `Plays at your volume, then lowers little by little over the last ${formatDuration(effectiveFade)} before stopping.`}
      </Text>

      <Button
        icon="timer-outline"
        label={hasMix ? `Start ${formatDuration(minutes)} timer` : 'Start timer'}
        onPress={() => {
          startTimer(minutes, effectiveFade);
          haptic.success();
        }}
        style={{ marginTop: spacing.xl }}
      />
      {!hasMix ? (
        <View style={styles.hint}>
          <Icon name="information-outline" size={18} color={colors.textMuted} />
          <Text style={[type.caption, { flex: 1 }]}>Add a few sounds first — the timer starts them when you begin.</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  ringWrap: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  clock: {
    color: colors.text,
    fontSize: 46,
    fontWeight: '300',
    letterSpacing: 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hint: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
});
