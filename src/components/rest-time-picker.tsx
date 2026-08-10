import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { WheelPicker } from '@/components/ui/wheel-picker';
import { MaxContentWidth, Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTime } from '@/utils/format';

const MINUTE_ITEMS = Array.from({ length: 61 }, (_, i) => String(i).padStart(2, '0'));
const SECOND_ITEMS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

type RestTimePickerProps = {
  visible: boolean;
  valueSeconds: number;
  onConfirm: (seconds: number) => void;
  onCancel: () => void;
};

export function RestTimePicker({
  visible,
  valueSeconds,
  onConfirm,
  onCancel,
}: RestTimePickerProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" style={styles.backdrop} onPress={onCancel} />

        {visible && (
          <PickerSheet valueSeconds={valueSeconds} onConfirm={onConfirm} onCancel={onCancel} />
        )}
      </View>
    </Modal>
  );
}

type PickerSheetProps = {
  valueSeconds: number;
  onConfirm: (seconds: number) => void;
  onCancel: () => void;
};

function PickerSheet({ valueSeconds, onConfirm, onCancel }: PickerSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [minutes, setMinutes] = useState(
    Math.min(MINUTE_ITEMS.length - 1, Math.floor(valueSeconds / 60)),
  );
  const [seconds, setSeconds] = useState(valueSeconds % 60);

  const handleConfirm = () => {
    onConfirm(minutes * 60 + seconds);
  };

  return (
    <View
      style={[
        styles.sheet,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          paddingBottom: insets.bottom + Spacing.four,
        },
      ]}>
      <View style={[styles.handle, { backgroundColor: theme.border }]} />

      <View style={styles.header}>
        <ThemedText type="heading">Descanso</ThemedText>
        <Button label="Listo" size="md" onPress={handleConfirm} />
      </View>

      <ThemedText style={[styles.preview, { color: theme.accent }]}>
        {formatTime(minutes * 60 + seconds)}
      </ThemedText>

      <View style={styles.wheels}>
        <WheelGroup label="min" items={MINUTE_ITEMS} value={minutes} onChange={setMinutes} />
        <WheelGroup label="seg" items={SECOND_ITEMS} value={seconds} onChange={setSeconds} />
      </View>
    </View>
  );
}

type WheelGroupProps = {
  label: string;
  items: readonly string[];
  value: number;
  onChange: (value: number) => void;
};

function WheelGroup({ label, items, value, onChange }: WheelGroupProps) {
  return (
    <View style={styles.wheelGroup}>
      <WheelPicker items={items} initialIndex={value} onChange={onChange} />
      <ThemedText type="caps" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6, 17, 38, 0.5)',
  },
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginBottom: Spacing.three,
  },
  preview: {
    fontFamily: Fonts.mono,
    fontSize: 48,
    lineHeight: 56,
    fontWeight: 700,
    fontVariant: ['tabular-nums'],
  },
  wheels: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.five,
    marginTop: Spacing.two,
  },
  wheelGroup: {
    alignItems: 'center',
    gap: Spacing.two,
    width: 96,
  },
});
