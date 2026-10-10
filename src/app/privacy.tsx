import { ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, type } from '../theme';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'The short version',
    body: 'Drift does not collect, store, sell or share any personal data. There are no accounts, no ads, no analytics and no tracking. The app works entirely offline.',
  },
  {
    title: 'What stays on your device',
    body: 'Your saved mixes, favourites, timer preferences and settings are stored locally on your device so the app remembers them. They never leave your device, and deleting the app removes them. You can also erase them at any time from Settings → Reset all data.',
  },
  {
    title: 'Permissions',
    body: 'Drift plays audio in the background so sounds continue while your screen is locked. On Android it may ask to show notifications so playback controls can appear in your notification shade and on the lock screen. Drift never uses your microphone, camera, location or contacts.',
  },
  {
    title: 'Children',
    body: 'Drift is suitable for all ages and collects no information from anyone, including children.',
  },
  {
    title: 'Changes',
    body: 'If this policy ever changes, the updated version will be published with the app update and on the app’s store listing.',
  },
  {
    title: 'Contact',
    body: 'Questions? Reach the developer via the contact details on the App Store or Google Play listing.',
  },
];

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
      <Text style={type.caption}>Last updated: October 2026</Text>
      {SECTIONS.map((s) => (
        <Text key={s.title} style={styles.section}>
          <Text style={type.heading}>{s.title}</Text>
          {'\n'}
          <Text style={styles.body}>{s.body}</Text>
        </Text>
      ))}
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
  section: {
    marginTop: spacing.xl,
  },
  body: {
    ...type.body,
    color: colors.textDim,
    lineHeight: 23,
  },
});
