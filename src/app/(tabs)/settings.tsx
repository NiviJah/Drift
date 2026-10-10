import * as Application from 'expo-application';
import { router } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Screen } from '../../components/Screen';
import { showToast } from '../../components/Toast';
import { Card, Chip, Divider, SectionHeader, SettingRow, VolumeSlider } from '../../components/ui';
import { useStore } from '../../state/store';
import { colors, spacing, type } from '../../theme';

const FADE_IN_OPTIONS = [0, 1, 3, 5, 10];

export default function SettingsScreen() {
  const { settings, masterVolume, updateSettings, setMasterVolume, resetAll } = useStore(
    useShallow((s) => ({
      settings: s.settings,
      masterVolume: s.masterVolume,
      updateSettings: s.updateSettings,
      setMasterVolume: s.setMasterVolume,
      resetAll: s.resetAll,
    })),
  );
  const version = Application.nativeApplicationVersion ?? '1.0.0';
  const build = Application.nativeBuildVersion;

  const confirmReset = () => {
    const run = () => {
      resetAll();
      showToast('All data has been reset');
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.('Reset everything? Saved mixes, favourites and settings will be deleted.')) run();
      return;
    }
    Alert.alert('Reset everything?', 'Saved mixes, favourites and settings will be deleted. This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: run },
    ]);
  };

  const rate = async () => {
    try {
      if (await StoreReview.isAvailableAsync()) await StoreReview.requestReview();
      else showToast('Thanks! Rating is available in the store app.');
    } catch {
      showToast('Rating isn’t available right now.');
    }
  };

  return (
    <Screen title="Settings">
      <SectionHeader title="Playback" />
      <Card>
        <View style={styles.block}>
          <Text style={type.body}>Master volume</Text>
          <VolumeSlider label="Master volume" value={masterVolume} onChange={setMasterVolume} />
        </View>
        <Divider />
        <View style={styles.block}>
          <Text style={type.body}>Fade in when starting</Text>
          <Text style={[type.caption, { marginTop: 2, marginBottom: spacing.md }]}>Ease into sound instead of starting at full volume.</Text>
          <View style={styles.chips}>
            {FADE_IN_OPTIONS.map((s) => (
              <Chip
                key={s}
                label={s === 0 ? 'Off' : `${s}s`}
                selected={settings.fadeInSeconds === s}
                onPress={() => updateSettings({ fadeInSeconds: s })}
              />
            ))}
          </View>
        </View>
        <Divider />
        <SettingRow
          icon="music-box-multiple-outline"
          title="Play with other apps"
          subtitle="Layer sounds under podcasts or music. Lock-screen controls are unavailable while on."
          value={settings.mixWithOthers}
          onValueChange={(v) => updateSettings({ mixWithOthers: v })}
        />
        <Divider />
        <SettingRow
          icon="headphones-off"
          title="Pause when headphones disconnect"
          value={settings.pauseOnDisconnect}
          onValueChange={(v) => updateSettings({ pauseOnDisconnect: v })}
        />
        <Divider />
        <SettingRow
          icon="cellphone-screenshot"
          title="Keep screen on while playing"
          subtitle="Useful on a nightstand. Uses more battery."
          value={settings.keepAwake}
          onValueChange={(v) => updateSettings({ keepAwake: v })}
        />
      </Card>

      <SectionHeader title="General" />
      <Card>
        <SettingRow icon="weather-night" title="Bedside clock" subtitle="A dim, distraction-free night screen." onPress={() => router.push('/nightstand')} />
        {Platform.OS !== 'web' ? (
          <>
            <Divider />
            <SettingRow icon="vibrate" title="Haptic feedback" value={settings.haptics} onValueChange={(v) => updateSettings({ haptics: v })} />
          </>
        ) : null}
      </Card>

      <SectionHeader title="About" />
      <Card>
        <SettingRow icon="star-outline" title="Rate Drift" subtitle="It really helps a small app grow." onPress={rate} />
        <Divider />
        <SettingRow icon="shield-lock-outline" title="Privacy" subtitle="No accounts, no tracking. Everything stays on your device." onPress={() => router.push('/privacy')} />
        <Divider />
        <SettingRow icon="delete-outline" title="Reset all data" destructive onPress={confirmReset} />
      </Card>

      <Text style={styles.footer}>
        Drift {version}
        {build ? ` (${build})` : ''}
        {'\n'}Every sound is synthesized — no recordings, works fully offline.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  footer: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 20,
  },
});
