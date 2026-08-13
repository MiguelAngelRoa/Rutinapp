import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PermissionState = 'checking' | 'granted' | 'denied';

const DISMISSAL_KEY = 'rutinapp:notification-banner-dismissed:v1';

export function NotificationPermissionBanner() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [permission, setPermission] = useState<PermissionState>('checking');
  const [dismissed, setDismissed] = useState(false);
  const progress = useSharedValue(0);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSAL_KEY)
      .then((value) => {
        if (value === '1') setDismissed(true);
      })
      .catch(() => {
        // Best-effort: the banner just shows again on next launch.
      });
  }, []);

  const hide = useCallback(() => {
    setDismissed(true);
    AsyncStorage.setItem(DISMISSAL_KEY, '1').catch(() => {
      // Best-effort: nothing else to clean up.
    });
  }, []);

  const check = useCallback(async () => {
    try {
      let current = await Notifications.getPermissionsAsync();
      if (current.status === 'undetermined') {
        current = await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowBadge: true, allowSound: true },
        });
      }
      setPermission(current.granted ? 'granted' : 'denied');
    } catch {
      setPermission('granted');
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setPermission('granted');
      return;
    }
    check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        check();
      }
    });
    return () => subscription.remove();
  }, [check]);

  const visible = !dismissed && permission === 'denied' && pathname !== '/explore';

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: 250 });
  }, [visible, progress]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: interpolate(progress.value, [0, 1], [-16, 0]) }],
  }));

  if (permission === 'checking') {
    return null;
  }

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[
        styles.overlay,
        { paddingTop: insets.top + Spacing.two },
        overlayStyle,
      ]}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: theme.backgroundElement, borderColor: theme.accent },
        ]}
      >
        <View style={styles.cardHeader}>
          <ThemedText type="smallBold">Activa las notificaciones</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar aviso"
            hitSlop={8}
            onPress={hide}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <ThemedText type="smallBold" style={styles.closeText}>
              ✕
            </ThemedText>
          </Pressable>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Para avisarte cuando termina el descanso entre series, activa las
          notificaciones de rutinapp.
        </ThemedText>
        <Button
          label="Activar en Ajustes"
          size="md"
          onPress={() => Linking.openSettings()}
          style={styles.action}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
    elevation: 6,
    ...Shadow,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  close: {
    padding: Spacing.one,
  },
  closeText: {
    color: '#9CA3AF',
    fontSize: 16,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.6,
  },
  action: {
    marginTop: Spacing.one,
  },
});
