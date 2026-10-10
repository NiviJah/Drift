import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '../../components/TabBar';
import { colors } from '../../theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Sounds' }} />
      <Tabs.Screen name="mixes" options={{ title: 'Mixes' }} />
      <Tabs.Screen name="timer" options={{ title: 'Timer' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
