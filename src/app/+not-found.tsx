import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Backdrop, Button } from '../components/ui';
import { colors, spacing, type } from '../theme';

export default function NotFound() {
  return (
    <View style={styles.root}>
      <Backdrop />
      <Text style={type.title}>Lost in the static</Text>
      <Text style={[type.caption, { marginTop: spacing.sm, marginBottom: spacing.xl }]}>That screen doesn’t exist.</Text>
      <Button label="Back to sounds" icon="music-note-outline" onPress={() => router.replace('/')} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
});
