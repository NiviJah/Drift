import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { CATEGORY_BY_ID, SOUND_BY_ID } from '../../audio/catalog';
import { ModalHeader } from '../../components/ModalHeader';
import { showToast } from '../../components/Toast';
import { Backdrop, Button, Card, Icon, IconButton, VolumeSlider } from '../../components/ui';
import { haptic } from '../../haptics';
import { MAX_MIX_SIZE, useStore } from '../../state/store';
import { alpha, colors, radius, spacing, type } from '../../theme';

export default function SoundDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const def = id ? SOUND_BY_ID[id] : undefined;
  const { volume, favorite, toggleSound, toggleFavorite, setSoundVolume } = useStore(
    useShallow((s) => ({
      volume: id ? s.mix[id] : undefined,
      favorite: id ? s.favorites.includes(id) : false,
      toggleSound: s.toggleSound,
      toggleFavorite: s.toggleFavorite,
      setSoundVolume: s.setSoundVolume,
    })),
  );

  if (!def) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ModalHeader title="Sound" />
        <Text style={[type.body, { textAlign: 'center', marginTop: 40 }]}>This sound isn’t available.</Text>
      </View>
    );
  }

  const cat = CATEGORY_BY_ID[def.category];
  const active = volume !== undefined;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Backdrop />
      <ModalHeader
        title={cat.name}
        right={
          <IconButton
            icon={favorite ? 'heart' : 'heart-outline'}
            color={favorite ? colors.danger : colors.text}
            label={favorite ? 'Remove from favourites' : 'Add to favourites'}
            onPress={() => {
              toggleFavorite(def.id);
              showToast(favorite ? 'Removed from favourites' : 'Added to favourites');
            }}
          />
        }
      />
      <View style={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={[styles.art, { backgroundColor: alpha(cat.color, 0.16), borderColor: alpha(cat.color, 0.4) }]}>
          <Icon name={def.icon} size={72} color={cat.color} />
        </View>
        <Text style={[type.title, { textAlign: 'center', marginTop: spacing.xl }]}>{def.name}</Text>
        <Text style={[type.body, styles.desc]}>{def.description}</Text>
        {def.headphones ? (
          <View style={styles.badge}>
            <Icon name="headphones" size={16} color={colors.textDim} />
            <Text style={type.caption}>Best with headphones</Text>
          </View>
        ) : null}

        {active ? (
          <Card style={styles.volume}>
            <Icon name="volume-low" size={20} color={colors.textDim} />
            <VolumeSlider label={`${def.name} volume`} value={volume} color={cat.color} onChange={(v) => setSoundVolume(def.id, v)} />
            <Icon name="volume-high" size={20} color={colors.textDim} />
          </Card>
        ) : null}

        <Button
          label={active ? 'Remove from mix' : 'Add to mix'}
          icon={active ? 'minus' : 'plus'}
          variant={active ? 'secondary' : 'primary'}
          onPress={() => {
            const r = toggleSound(def.id);
            if (r === 'limit') {
              haptic.warning();
              showToast(`Mixes can hold up to ${MAX_MIX_SIZE} sounds`);
              return;
            }
            if (r === 'removed') router.back();
          }}
          style={{ marginTop: spacing.xl }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    alignItems: 'stretch',
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  art: {
    alignSelf: 'center',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  desc: {
    textAlign: 'center',
    color: colors.textDim,
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  volume: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.xl,
  },
});
