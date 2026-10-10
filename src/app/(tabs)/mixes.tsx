import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { ActionSheet } from '../../components/ActionSheet';
import { MixIcons, mixSummary } from '../../components/MixIcons';
import { Screen } from '../../components/Screen';
import { showToast } from '../../components/Toast';
import { Button, Card, Icon, IconButton, SectionHeader } from '../../components/ui';
import { haptic } from '../../haptics';
import { FEATURED_PRESETS } from '../../state/presets';
import type { FeaturedPreset, Preset } from '../../state/presets';
import { mixesEqual, useStore } from '../../state/store';
import { colors, radius, spacing, type } from '../../theme';

const COLLECTIONS: FeaturedPreset['collection'][] = ['Sleep', 'Focus', 'Relax', 'Baby'];

function confirm(title: string, message: string, confirmLabel: string, onConfirm: () => void): void {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

export default function MixesScreen() {
  const { mix, presets, activePresetId, isPlaying, loadMix, updatePreset, deletePreset, togglePlay } = useStore(
    useShallow((s) => ({
      mix: s.mix,
      presets: s.presets,
      activePresetId: s.activePresetId,
      isPlaying: s.isPlaying,
      loadMix: s.loadMix,
      updatePreset: s.updatePreset,
      deletePreset: s.deletePreset,
      togglePlay: s.togglePlay,
    })),
  );
  const [menuFor, setMenuFor] = useState<Preset | null>(null);
  const hasMix = Object.keys(mix).length > 0;
  const activeUserPreset = presets.find((p) => p.id === activePresetId);
  const modified = activeUserPreset ? !mixesEqual(activeUserPreset.mix, mix) : false;

  const playPreset = (p: Preset) => {
    haptic.tap();
    if (p.id === activePresetId && mixesEqual(p.mix, mix)) {
      togglePlay();
      return;
    }
    loadMix(p.mix, p.id);
  };

  return (
    <Screen title="Mixes" subtitle="Save your favourite combinations or start from ours.">
      <Card style={styles.current}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          {hasMix ? <MixIcons mix={mix} /> : <Icon name="playlist-music" size={28} color={colors.textMuted} />}
          <View style={{ flex: 1 }}>
            <Text style={type.heading}>{activeUserPreset ? activeUserPreset.name : 'Current mix'}</Text>
            <Text style={type.caption} numberOfLines={2}>
              {hasMix ? mixSummary(mix) : 'Add sounds from the Sounds tab to build a mix.'}
            </Text>
          </View>
        </View>
        {hasMix ? (
          <View style={styles.currentActions}>
            {activeUserPreset && modified ? (
              <Button
                compact
                variant="secondary"
                icon="content-save-outline"
                label="Update"
                onPress={() => {
                  updatePreset(activeUserPreset.id);
                  haptic.success();
                  showToast(`Updated “${activeUserPreset.name}”`);
                }}
                style={{ flex: 1 }}
              />
            ) : null}
            <Button
              compact
              icon={activeUserPreset && !modified ? 'check' : 'plus'}
              label={activeUserPreset && !modified ? 'Saved' : 'Save as new mix'}
              disabled={!!activeUserPreset && !modified}
              onPress={() => router.push('/save-mix')}
              style={{ flex: 1 }}
            />
          </View>
        ) : (
          <Button compact variant="secondary" icon="music-note-outline" label="Browse sounds" onPress={() => router.navigate('/')} style={{ marginTop: spacing.md }} />
        )}
      </Card>

      <SectionHeader title={`Your mixes${presets.length ? ` · ${presets.length}` : ''}`} />
      {presets.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Icon name="bookmark-outline" size={28} color={colors.textMuted} />
          <Text style={[type.caption, { textAlign: 'center', marginTop: spacing.sm }]}>
            Mixes you save appear here, ready to play in one tap.
          </Text>
        </Card>
      ) : (
        <Card>
          {presets.map((p, i) => {
            const active = p.id === activePresetId;
            return (
              <View key={p.id}>
                {i > 0 ? <View style={styles.sep} /> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Play ${p.name}`}
                  onPress={() => playPreset(p)}
                  onLongPress={() => setMenuFor(p)}
                  style={({ pressed }) => [styles.presetRow, pressed && { backgroundColor: colors.surfacePressed }]}
                >
                  <MixIcons mix={p.mix} max={3} size={28} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[type.body, { fontWeight: '600' }, active && { color: colors.accent }]} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={type.caption} numberOfLines={1}>
                      {mixSummary(p.mix)}
                    </Text>
                  </View>
                  <IconButton
                    icon={active && isPlaying ? 'pause-circle' : 'play-circle'}
                    size={30}
                    color={colors.accent}
                    label={active && isPlaying ? `Pause ${p.name}` : `Play ${p.name}`}
                    onPress={() => playPreset(p)}
                  />
                  <IconButton icon="dots-horizontal" label={`More options for ${p.name}`} color={colors.textDim} onPress={() => setMenuFor(p)} />
                </Pressable>
              </View>
            );
          })}
        </Card>
      )}

      {COLLECTIONS.map((collection) => (
        <View key={collection}>
          <SectionHeader title={collection} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredScroll} contentContainerStyle={styles.featuredRow}>
            {FEATURED_PRESETS.filter((f) => f.collection === collection).map((f) => {
              const active = f.id === activePresetId && mixesEqual(f.mix, mix);
              return (
                <Pressable
                  key={f.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${f.name}. ${f.description}`}
                  onPress={() => playPreset(f)}
                  style={({ pressed }) => [styles.featured, pressed && { transform: [{ scale: 0.98 }] }]}
                >
                  <LinearGradient colors={f.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  <View style={styles.featuredTop}>
                    <View style={styles.featuredIcon}>
                      <Icon name={f.icon} size={22} color="#fff" />
                    </View>
                    <Icon name={active && isPlaying ? 'pause-circle' : 'play-circle'} size={30} color="rgba(255,255,255,0.9)" />
                  </View>
                  <View>
                    <Text style={styles.featuredName}>{f.name}</Text>
                    <Text style={styles.featuredDesc} numberOfLines={2}>
                      {f.description}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ))}

      <ActionSheet
        visible={!!menuFor}
        title={menuFor?.name}
        onClose={() => setMenuFor(null)}
        actions={
          menuFor
            ? [
                { label: 'Play', icon: 'play', onPress: () => loadMix(menuFor.mix, menuFor.id) },
                {
                  label: 'Rename',
                  icon: 'pencil-outline',
                  onPress: () => router.push({ pathname: '/save-mix', params: { renameId: menuFor.id } }),
                },
                ...(hasMix
                  ? [
                      {
                        label: 'Replace with current mix',
                        icon: 'content-save-outline' as const,
                        onPress: () => {
                          updatePreset(menuFor.id);
                          showToast(`Updated “${menuFor.name}”`);
                        },
                      },
                    ]
                  : []),
                {
                  label: 'Delete',
                  icon: 'delete-outline',
                  destructive: true,
                  onPress: () =>
                    confirm('Delete mix?', `“${menuFor.name}” will be removed. This can’t be undone.`, 'Delete', () => {
                      deletePreset(menuFor.id);
                      haptic.success();
                    }),
                },
              ]
            : []
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  current: {
    padding: spacing.lg,
  },
  currentActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.lg,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.md,
  },
  featuredScroll: {
    marginHorizontal: -spacing.lg,
  },
  featuredRow: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  featured: {
    width: 220,
    height: 150,
    borderRadius: radius.lg,
    overflow: 'hidden',
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  featuredTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  featuredIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  featuredDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
});
