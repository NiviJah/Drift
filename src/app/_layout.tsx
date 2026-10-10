import { DarkTheme, SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAudioController } from '../audio/useAudioController';
import { ToastHost } from '../components/Toast';
import { useStore } from '../state/store';
import { colors } from '../theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
SystemUI.setBackgroundColorAsync(colors.bg).catch(() => undefined);

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
  },
};

export default function RootLayout() {
  useAudioController();
  const hydrated = useStore((s) => s.hydrated);

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => undefined);
  }, [hydrated]);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="mixer" options={{ presentation: 'modal' }} />
            <Stack.Screen name="save-mix" options={{ presentation: 'modal' }} />
            <Stack.Screen name="sound/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="nightstand" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
            <Stack.Screen name="privacy" options={{ headerShown: true, title: 'Privacy Policy' }} />
          </Stack>
          <ToastHost />
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
