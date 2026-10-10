import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { CATEGORY_BY_ID, SOUND_BY_ID } from '../audio/catalog';
import { formatClock } from '../audio/math';
import { describeMix } from '../audio/useAudioController';
import { ModalHeader } from '../components/ModalHeader';
import { Backdrop, Button, Card, Icon, IconButton, SectionHeader, VolumeSlider } from '../components/ui';
import { haptic } from '../haptics';
import { useNow } from '../hooks/useNow';
import { MAX_MIX_SIZE, mixesEqual, useStore } from '../state/store';
import { alpha, colors, radius, spacing, type } from '../theme';

export default function MixerScreen() {
  const insets = useSafeAreaInsets();
  const s = useStore(
    useShallow((st) => ({
      mix: st.mix,
      isPlaying: st.isPlaying,
      masterVolume: st.masterVolume,
      timer: st.timer,
      activePresetId: st.activePresetId,
      presets: st.presets,
      togglePlay: st.togglePlay,
      setSoundVolume: st.setSoundVolume,
      removeSound: st.removeSound,
      setMasterVolume: st.setMasterVolume,
      clearMix: st.clearMix,
      updatePreset: st.updatePreset,
    })),
  );
  const now = useNow(!!s.timer);
  const ids = Object.keys(s.mix);
  const activeUserPreset = s.presets.find((p) => p.id === s.activePresetId);
  const modified = activeUserPreset ? !mixesEqual(activeUserPreset.mix, s.mix) : true;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Backdrop />
      <ModalHeader
        title="Now Playing"
        right={<IconButton icon="timer-outline" label="Sleep timer" onPress={() => router.navigate('/timer')} />}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.hero}>
          <Text style={[type.title, { textAlign: 'center' }]} numberOfLines={2}>
            {ids.length ? describeMix(s.mix, s.activePresetId) : 'Nothing playing'}
          </Text>
          {s.timer ? (
            <Pressable onPress={() => router.navigate('/timer')} style={styles.timerPill} accessibilityRole="button">
              <Icon name="timer-sand" size={16} color={colors.accent} />
              <Text style={[type.caption, { color: colors.text }, type.mono]}>{formatClock(s.timer.endsAt - now)}</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={s.isPlaying ? 'Pause' : 'Play'}
            disabled={!ids.length}
            onPress={() => {
              haptic.tap();
              s.togglePlay();
            }}
            style={({ pressed }) => [styles.bigPlay, pressed && { backgroundColor: colors.accentStrong }, !ids.length && { opacity: 0.4 }]}
          >
            <Icon name={s.isPlaying ? 'pause' : 'play'} size={40} color={colors.accentText} />
          </Pressable>
        </View>

        <Card style={styles.masterCard}>
          <Icon name="volume-low" size={20} color={colors.textDim} />
          <VolumeSlider label="Master volume" value={s.masterVolume} onChange={s.setMasterVolume} />
          <Icon name="volume-high" size={20} color={colors.textDim} />
        </Card>

        <SectionHeader
          title={`Sounds · ${ids.length}/${MAX_MIX_SIZE}`}
          action={
            ids.length ? (
              <Pressable onPress={s.clearMix} accessibilityRole="button" hitSlop={8}>
                <Text style={[type.caption, { color: colors.danger }]}>Clear all</Text>
              </Pressable>
            ) : null
          }
        />
        {ids.length === 0 ? (
          <Card style={{ padding: spacing.xl, alignItems: 'center' }}>
            <Text style={[type.caption, { textAlign: 'center' }]}>Your mix is empty. Add sounds to start layering.</Text>
          </Card>
        ) : (
          <Card>
            {ids.map((id, i) => {
              const def = SOUND_BY_ID[id];
              const tint = CATEGORY_BY_ID[def.category].color;
              return (
                <View key={id} style={[styles.row, i > 0 && styles.rowBorder]}>
                  <View style={[styles.rowIcon, { backgroundColor: alpha(tint, 0.2) }]}>
                    <Icon name={def.icon} size={20} color={tint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.rowTop}>
                      <Text style={[type.body, { fontWeight: '600' }]} numberOfLines={1}>
                        {def.name}
                      </Text>
                      <Text style={[type.caption, type.mono]}>{Math.round(s.mix[id] * 100)}%</Text>
                    </View>
                    <VolumeSlider
                      label={`${def.name} volume`}
                      value={s.mix[id]}
                      color={tint}
                      onChange={(v) => s.setSoundVolume(id, v)}
                    />
                  </View>
                  <IconButton icon="close" size={18} label={`Remove ${def.name}`} color={colors.textMuted} onPress={() => s.removeSound(id)} />
                </View>
              );
            })}
          </Card>
        )}

        <View style={styles.actions}>
          <Button
            variant="secondary"
            icon="plus"
            label="Add sounds"
            disabled={ids.length >= MAX_MIX_SIZE}
            onPress={() => router.navigate('/')}
            style={{ flex: 1 }}
          />
          {activeUserPreset && modified ? (
            <Button
              icon="content-save-outline"
              label="Update mix"
              onPress={() => {
                s.updatePreset(activeUserPreset.id);
                haptic.success();
              }}
              style={{ flex: 1 }}
            />
          ) : (
            <Button
              icon={activeUserPreset ? 'check' : 'bookmark-outline'}
              label={activeUserPreset ? 'Saved' : 'Save mix'}
              disabled={!ids.length || (!!activeUserPreset && !modified)}
              onPress={() => router.push('/save-mix')}
              style={{ flex: 1 }}
            />
          )}
        </View>
        {ids.some((id) => SOUND_BY_ID[id].headphones) ? (
          <View style={styles.tip}>
            <Icon name="headphones" size={18} color={colors.textDim} />
            <Text style={[type.caption, { flex: 1 }]}>Binaural beats need headphones — each ear hears a slightly different tone.</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.lg,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
  bigPlay: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  masterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
