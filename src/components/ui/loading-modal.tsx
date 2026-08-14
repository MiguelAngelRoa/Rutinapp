import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type LoadingModalProps = {
  visible: boolean;
  message?: string;
};

export function LoadingModal({
  visible,
  message = 'Cargando por favor…',
}: LoadingModalProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}
        >
          <ActivityIndicator size="large" color={theme.accent} />
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.message}>
            {message}
          </ThemedText>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  card: {
    minWidth: 220,
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  message: {
    textAlign: 'center',
  },
});
