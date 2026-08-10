import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { RestTimePicker } from '@/components/rest-time-picker';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Exercise } from '@/types/workout';
import { formatRest } from '@/utils/format';

type ExerciseRowProps = {
  exercise: Exercise;
  onChange: (patch: Partial<Exercise>) => void;
  onDelete: () => void;
};

export function ExerciseRow({ exercise, onChange, onDelete }: ExerciseRowProps) {
  const theme = useTheme();
  const [pickerVisible, setPickerVisible] = useState(false);

  return (
    <Card style={styles.row}>
      <View style={styles.header}>
        <TextInput
          value={exercise.name}
          onChangeText={(name) => onChange({ name })}
          placeholder="Nombre del ejercicio"
          placeholderTextColor={theme.textSecondary}
          style={[styles.nameInput, { color: theme.text }]}
        />
        <Pressable
          accessibilityRole="button"
          onPress={onDelete}
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.deleteText}>
            Eliminar
          </ThemedText>
        </Pressable>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.steppers}>
        <Stepper
          label="Series"
          value={exercise.sets}
          step={1}
          onChange={(sets) => onChange({ sets })}
        />
        <Stepper
          label="Reps"
          value={exercise.reps}
          step={1}
          onChange={(reps) => onChange({ reps })}
        />
        <View style={styles.stepper}>
          <ThemedText type="caps" themeColor="textSecondary" style={styles.stepperLabel}>
            Descanso
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPickerVisible(true)}
            style={({ pressed }) => [
              styles.restControl,
              { backgroundColor: theme.accentSoft },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.accent, fontVariant: ['tabular-nums'] }}>
              {formatRest(exercise.restSeconds)}
            </ThemedText>
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              ›
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <RestTimePicker
        visible={pickerVisible}
        valueSeconds={exercise.restSeconds}
        onConfirm={(restSeconds) => {
          onChange({ restSeconds });
          setPickerVisible(false);
        }}
        onCancel={() => setPickerVisible(false)}
      />
    </Card>
  );
}

type StepperProps = {
  label: string;
  value: number;
  step: number;
  onChange: (value: number) => void;
};

function Stepper({ label, value, step, onChange }: StepperProps) {
  const theme = useTheme();

  const handleChange = (delta: number) => {
    onChange(Math.max(0, value + delta * step));
  };

  return (
    <View style={styles.stepper}>
      <ThemedText type="caps" themeColor="textSecondary" style={styles.stepperLabel}>
        {label}
      </ThemedText>
      <View style={[styles.stepperControl, { backgroundColor: theme.accentSoft }]}>
        <StepButton label="−" onPress={() => handleChange(-1)} color={theme.accent} />
        <ThemedText type="smallBold" style={[styles.stepperValue, { color: theme.text }]}>
          {value}
        </ThemedText>
        <StepButton label="+" onPress={() => handleChange(1)} color={theme.accent} />
      </View>
    </View>
  );
}

function StepButton({ label, onPress, color }: { label: string; onPress: () => void; color: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}>
      <ThemedText type="smallBold" style={{ color }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.three,
    padding: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  nameInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: 700,
    paddingVertical: Spacing.one,
  },
  deleteButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  deleteText: {
    color: '#F04438',
  },
  pressed: {
    opacity: 0.6,
  },
  divider: {
    height: 1,
    alignSelf: 'stretch',
  },
  steppers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  stepper: {
    flexGrow: 1,
    flexBasis: 116,
    alignItems: 'center',
    gap: Spacing.two,
  },
  stepperLabel: {
    fontSize: 10,
  },
  stepperControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.one,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  restControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 48,
    minWidth: 104,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
  },
});
