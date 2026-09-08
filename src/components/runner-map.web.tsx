import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type RunnerMapProps = {
  route: { latitude: number; longitude: number }[];
  currentLocation: { latitude: number; longitude: number } | null;
  paused: boolean;
  showPois: boolean;
};

export default function RunnerMap({
  route: _route,
  currentLocation: _currentLocation,
  paused: _paused,
  showPois: _showPois,
}: RunnerMapProps) {
  return (
    // MapLibre has no web implementation: show a themed placeholder so
    // the live stats still work on the web build.
    <ThemedText
      style={styles.placeholder}
      type="small"
      themeColor="textSecondary"
    >
      El mapa no está disponible en la web.
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    marginTop: 8,
    textAlign: 'center',
  },
});