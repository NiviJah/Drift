import { useEffect, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudioManager } from 'react-native-audio-api';

import { clearEvents, formatEvents, getEvents, logEvent, onEventsChange } from '../audio/diagnostics';
import { Button } from '../components/ui';
import { colors, radius, spacing, type } from '../theme';

/** Recent playback events, for diagnosing device-specific audio problems. */
export default function DiagnosticsScreen() {
  const insets = useSafeAreaInsets();
  const [, setVersion] = useState(0);

  useEffect(() => onEventsChange(() => setVersion((v) => v + 1)), []);

  const logOutputs = async () => {
    try {
      const info = await AudioManager.getDevicesInfo();
      const outs = info.currentOutputs.map((d) => `${d.name} (${d.category})`).join(', ') || 'none reported';
      logEvent(`outputs: ${outs}`);
    } catch (e) {
      logEvent(`outputs: unavailable (${String(e)})`);
    }
  };

  const events = getEvents();
  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
      <Text style={[type.caption, { marginBottom: spacing.lg }]}>
        If sound won’t start or stops on its own (for example over Bluetooth or in the car), reproduce the problem, then share
        this log with the developer.
      </Text>
      <View style={styles.actions}>
        <Button compact icon="share-variant-outline" label="Share log" onPress={() => Share.share({ message: formatEvents() || 'No events' })} style={{ flex: 1 }} />
        <Button compact variant="secondary" icon="speaker" label="Log outputs" onPress={logOutputs} style={{ flex: 1 }} />
        <Button compact variant="secondary" icon="delete-outline" label="Clear" onPress={clearEvents} style={{ flex: 1 }} />
      </View>
      <View style={styles.log}>
        {events.length === 0 ? (
          <Text style={type.caption}>No events yet. Press play to start recording.</Text>
        ) : (
          [...events].reverse().map((e, i) => (
            <Text key={`${e.at}-${i}`} style={[styles.line, type.mono]}>
              <Text style={{ color: colors.textMuted }}>{new Date(e.at).toTimeString().slice(0, 8)} </Text>
              {e.message}
            </Text>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  log: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
  },
  line: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
});
