import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MixIcons, mixSummary } from '../components/MixIcons';
import { ModalHeader } from '../components/ModalHeader';
import { showToast } from '../components/Toast';
import { Backdrop, Button, Chip } from '../components/ui';
import { haptic } from '../haptics';
import { useStore } from '../state/store';
import { colors, radius, spacing, type } from '../theme';

const SUGGESTIONS = ['Bedtime', 'Deep Focus', 'Nap', 'Reading', 'Baby Sleep', 'Rainy Day', 'Meditation', 'Travel'];

export default function SaveMixScreen() {
  const insets = useSafeAreaInsets();
  const { renameId } = useLocalSearchParams<{ renameId?: string }>();
  const presets = useStore((s) => s.presets);
  const mix = useStore((s) => s.mix);
  const savePreset = useStore((s) => s.savePreset);
  const renamePreset = useStore((s) => s.renamePreset);
  const renaming = renameId ? presets.find((p) => p.id === renameId) : undefined;
  const [name, setName] = useState(renaming?.name ?? '');
  const shownMix = renaming ? renaming.mix : mix;
  const trimmed = name.trim();

  const submit = () => {
    if (!trimmed) return;
    if (renaming) {
      renamePreset(renaming.id, trimmed);
      showToast('Mix renamed');
    } else {
      savePreset(trimmed);
      showToast(`Saved “${trimmed}”`);
    }
    haptic.success();
    router.back();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Backdrop />
      <ModalHeader title={renaming ? 'Rename mix' : 'Save mix'} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.content}>
          <View style={styles.preview}>
            <MixIcons mix={shownMix} size={40} max={5} />
            <Text style={[type.caption, { textAlign: 'center', marginTop: spacing.md }]} numberOfLines={3}>
              {mixSummary(shownMix) || 'Empty mix'}
            </Text>
          </View>
          <Text style={[type.micro, { marginBottom: spacing.sm }]}>NAME</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Rainy Bedtime"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoFocus
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={submit}
            accessibilityLabel="Mix name"
          />
          {!renaming ? (
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((sug) => (
                <Chip key={sug} label={sug} selected={name === sug} onPress={() => setName(sug)} />
              ))}
            </View>
          ) : null}
          <Button
            label={renaming ? 'Rename' : 'Save mix'}
            icon="check"
            disabled={!trimmed || (!renaming && Object.keys(mix).length === 0)}
            onPress={submit}
            style={{ marginTop: spacing.xl }}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
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
    maxWidth: 560,
    alignSelf: 'center',
  },
  preview: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  input: {
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    fontSize: 17,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
