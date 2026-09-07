import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { ModeMenu } from '@/components/mode-menu';
import { MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useMode } from '@/context/mode-context';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const { mode } = useMode();
  const isRunner = mode === 'runner';
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cambiar modo"
            onPress={() => setMenuVisible(true)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <ThemedView style={styles.tabButtonView}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Modos
              </ThemedText>
            </ThemedView>
          </Pressable>
          {!isRunner && (
            <>
              <TabTrigger name="routine" href="/routine" asChild>
                <TabButton>Rutina</TabButton>
              </TabTrigger>
              <TabTrigger name="program" href="/program" asChild>
                <TabButton>Programa</TabButton>
              </TabTrigger>
            </>
          )}
          {isRunner && (
            <TabTrigger name="runner" href="/runner" asChild>
              <TabButton>Runner</TabButton>
            </TabTrigger>
          )}
          <TabTrigger name="schedule" href="/schedule" asChild>
            <TabButton>Agenda</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
      <ModeMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const theme = useTheme();
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        style={[
          styles.tabButtonView,
          isFocused && { backgroundColor: theme.accent },
        ]}>
        <ThemedText
          type="smallBold"
          themeColor={isFocused ? 'onAccent' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const theme = useTheme();
  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView
        type="backgroundElement"
        style={[styles.innerContainer, { borderColor: theme.border }]}>
        <ThemedText type="smallBold" style={[styles.brandText, { color: theme.accent }]}>
          Rutinapp
        </ThemedText>

        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    ...Shadow,
  },
  brandText: {
    marginRight: 'auto',
    fontSize: 14,
    paddingLeft: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
  },
});