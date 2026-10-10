import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { CATEGORIES, CATEGORY_BY_ID, SOUNDS, searchSounds } from '../../audio/catalog';
import type { CategoryId, SoundDef } from '../../audio/catalog';
import { Screen } from '../../components/Screen';
import { SoundTile } from '../../components/SoundTile';
import { showToast } from '../../components/Toast';
import { Chip, Icon, IconButton, SectionHeader } from '../../components/ui';
import { haptic } from '../../haptics';
import { useLoadingSounds } from '../../hooks/useLoadingSounds';
import { MAX_MIX_SIZE, useStore } from '../../state/store';
import { colors, radius, spacing, type } from '../../theme';

type Filter = 'all' | 'favorites' | CategoryId;

const GAP = 10;
const MIN_TILE = 104;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Can’t sleep? Build a mix to drift off.';
  if (h < 12) return 'Good morning. Find your focus.';
  if (h < 18) return 'Good afternoon. Take a calm moment.';
  return 'Good evening. Time to wind down.';
}

export default function SoundsScreen() {
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const loading = useLoadingSounds();
  const { mix, favorites, isPlaying, toggleSound, randomMix } = useStore(
    useShallow((s) => ({
      mix: s.mix,
      favorites: s.favorites,
      isPlaying: s.isPlaying,
      toggleSound: s.toggleSound,
      randomMix: s.randomMix,
    })),
  );

  const contentWidth = Math.min(width, 900) - spacing.lg * 2;
  const columns = Math.max(3, Math.floor((contentWidth + GAP) / (MIN_TILE + GAP)));
  const tileWidth = Math.floor((contentWidth - GAP * (columns - 1)) / columns);

  const onPress = useCallback(
    (id: string) => {
      const result = toggleSound(id);
      if (result === 'limit') {
        haptic.warning();
        showToast(`Mixes can hold up to ${MAX_MIX_SIZE} sounds`);
      } else {
        haptic.tap();
      }
    },
    [toggleSound],
  );

  const onLongPress = useCallback((id: string) => {
    haptic.select();
    router.push({ pathname: '/sound/[id]', params: { id } });
  }, []);

  const sections = useMemo((): { title: string | null; sounds: SoundDef[] }[] => {
    let pool = SOUNDS;
    if (filter === 'favorites') pool = SOUNDS.filter((s) => favorites.includes(s.id));
    else if (filter !== 'all') pool = SOUNDS.filter((s) => s.category === filter);
    const results = searchSounds(query, pool);
    if (query.trim() || filter !== 'all') return [{ title: null, sounds: results }];
    return CATEGORIES.map((c) => ({ title: c.name, sounds: results.filter((s) => s.category === c.id) })).filter(
      (s) => s.sounds.length > 0,
    );
  }, [filter, favorites, query]);

  const isEmpty = sections.every((s) => s.sounds.length === 0);

  const renderGrid = (sounds: SoundDef[]) => (
    <View style={styles.grid}>
      {sounds.map((s) => (
        <SoundTile
          key={s.id}
          sound={s}
          width={tileWidth}
          active={s.id in mix}
          volume={mix[s.id] ?? 0}
          favorite={favorites.includes(s.id)}
          loading={loading.has(s.id)}
          playing={isPlaying}
          onPress={onPress}
          onLongPress={onLongPress}
        />
      ))}
    </View>
  );

  return (
    <Screen
      title="Drift"
      subtitle={greeting()}
      right={
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <IconButton
            icon="shuffle-variant"
            label="Surprise me with a random mix"
            filled
            onPress={() => {
              randomMix();
              showToast('Here’s a fresh mix — tweak it in the player');
            }}
          />
          <IconButton icon="weather-night" label="Open bedside clock" filled onPress={() => router.push('/nightstand')} />
        </View>
      }
      header={
        <>
          <View style={styles.search}>
            <Icon name="magnify" size={20} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search sounds — rain, fan, baby…"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="never"
              accessibilityLabel="Search sounds"
            />
            {query ? <IconButton icon="close" size={18} label="Clear search" color={colors.textDim} onPress={() => setQuery('')} /> : null}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            style={styles.chipScroll}
          >
            <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
            <Chip
              label="Favourites"
              icon="heart"
              color={colors.danger}
              selected={filter === 'favorites'}
              onPress={() => setFilter('favorites')}
            />
            {CATEGORIES.map((c) => (
              <Chip key={c.id} label={c.name} icon={c.icon} color={c.color} selected={filter === c.id} onPress={() => setFilter(c.id)} />
            ))}
          </ScrollView>
        </>
      }
    >
      {isEmpty ? (
        <View style={styles.empty}>
          <Icon name={filter === 'favorites' && !query ? 'heart-outline' : 'magnify'} size={40} color={colors.textMuted} />
          <Text style={[type.heading, { marginTop: spacing.md }]}>
            {filter === 'favorites' && !query ? 'No favourites yet' : 'No sounds found'}
          </Text>
          <Text style={[type.caption, { textAlign: 'center', marginTop: 6 }]}>
            {filter === 'favorites' && !query
              ? 'Long-press any sound and tap the heart to keep it here.'
              : `Nothing matches “${query}”. Try “rain”, “sleep” or “focus”.`}
          </Text>
        </View>
      ) : (
        sections.map((section) =>
          section.title ? (
            <View key={section.title}>
              <SectionHeader title={section.title} />
              {renderGrid(section.sounds)}
            </View>
          ) : (
            <View key="results" style={{ marginTop: spacing.lg }}>
              {filter !== 'all' && filter !== 'favorites' && !query ? (
                <Text style={[type.caption, { marginBottom: spacing.md }]}>
                  {SOUNDS.filter((s) => s.category === filter).length} sounds in {CATEGORY_BY_ID[filter].name}
                </Text>
              ) : null}
              {renderGrid(section.sounds)}
            </View>
          ),
        )
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
    paddingLeft: 14,
    paddingRight: 4,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    height: '100%',
    ...Platform.select({ web: { outlineWidth: 0 }, default: {} }),
  },
  chipScroll: {
    marginTop: spacing.md,
    marginHorizontal: -spacing.lg,
  },
  chips: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.xl,
  },
});
