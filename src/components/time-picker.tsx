import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { WheelPicker } from '@/components/ui/wheel-picker';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TimeOfDay } from '@/types/workout';
import { from24Hour, to24Hour, type Time12 } from '@/utils/format';

const HOUR_ITEMS = [
  '12',
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
];
const MINUTE_ITEMS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIOD_ITEMS = ['AM', 'PM'];

type TimePickerProps = {
  initialTime: TimeOfDay | null;
  onConfirm: (time: TimeOfDay) => void;
  onCancel: () => void;
};

export function TimePicker({ initialTime, onConfirm, onCancel }: TimePickerProps) {
  const theme = useTheme();
  const [time, setTime] = useState<Time12>(() =>
    initialTime ? from24Hour(initialTime.hour, initialTime.minute) : from24Hour(7, 0),
  );

  const hourIndex = time.hour12 === 12 ? 0 : time.hour12;
  const minuteIndex = time.minute;
  const periodIndex = time.period === 'AM' ? 0 : 1;

  const preview = `${HOUR_ITEMS[hourIndex]}:${MINUTE_ITEMS[minuteIndex]} ${PERIOD_ITEMS[periodIndex]}`;

  return (
    <View style={styles.overlay}>
      <View style={styles.center}>
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="heading" style={styles.title}>
            Hora del entrenamiento
          </ThemedText>

          <ThemedText style={[styles.preview, { color: theme.accent }]}>{preview}</ThemedText>

          <View style={styles.wheels}>
            <WheelGroup
              label="hora"
              items={HOUR_ITEMS}
              value={hourIndex}
              onChange={(index) => setTime((current) => ({ ...current, hour12: index === 0 ? 12 : index }))}
            />
            <WheelGroup
              label="min"
              items={MINUTE_ITEMS}
              value={minuteIndex}
              onChange={(index) => setTime((current) => ({ ...current, minute: index }))}
            />
            <WheelGroup
              label=""
              items={PERIOD_ITEMS}
              value={periodIndex}
              onChange={(index) => setTime((current) => ({ ...current, period: index === 0 ? 'AM' : 'PM' }))}
            />
          </View>

          <View style={styles.actions}>
            <Button label="Cancelar" variant="ghost" size="md" onPress={onCancel} style={styles.actionButton} />
            <Button label="Listo" size="md" onPress={() => onConfirm(to24Hour(time))} style={styles.actionButton} />
          </View>
        </ThemedView>
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
      <WheelPicker items={items} initialIndex={value} onChange={onChange} visibleCount={3} />
      {label ? (
        <ThemedText type="caps" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : (
        <View style={styles.labelSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  center: {
    width: '100%',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  preview: {
    textAlign: 'center',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: 700,
    fontVariant: ['tabular-nums'],
  },
  wheels: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  wheelGroup: {
    alignItems: 'center',
    gap: Spacing.one,
    width: 84,
  },
  labelSpacer: {
    height: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
  },
});
