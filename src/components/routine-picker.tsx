import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { useWorkout } from '@/context/workout-context';
import { useTheme } from '@/hooks/use-theme';

type RoutinePickerProps = {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCancel: () => void;
};

export function RoutinePicker({ selectedId, onSelect, onCancel }: RoutinePickerProps) {
  const theme = useTheme();
  const { routines } = useWorkout();

  return (
    <View style={styles.overlay}>
      <View style={styles.center}>
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="heading" style={styles.title}>
            Elegir rutina
          </ThemedText>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            <Option
              label="Ninguna"
              selected={selectedId == null}
              onPress={() => {
                onSelect(null);
                onCancel();
              }}
            />
            {routines.map((routine) => (
              <Option
                key={routine.id}
                label={routine.name}
                sub={`${routine.exercises.length} ejercicios`}
                selected={routine.id === selectedId}
                onPress={() => {
                  onSelect(routine.id);
                  onCancel();
                }}
              />
            ))}
            {routines.length === 0 && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                Aún no tienes rutinas guardadas. Créalas en la pestaña «Rutina».
              </ThemedText>
            )}
          </ScrollView>

          <Button label="Cancelar" variant="ghost" size="md" onPress={onCancel} style={styles.button} />
        </ThemedView>
      </View>
    </View>
  );
}

type OptionProps = {
  label: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
};

function Option({ label, sub, selected, onPress }: OptionProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        { borderColor: selected ? theme.accent : theme.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.optionBody}>
        <ThemedText type="smallBold" numberOfLines={1} style={[selected && { color: theme.accent }]}>
          {label}
        </ThemedText>
        {sub ? (
          <ThemedText type="small" themeColor="textSecondary">
            {sub}
          </ThemedText>
        ) : null}
      </View>
      {selected && <MaterialCommunityIcons name="check" size={20} color={theme.accent} />}
    </Pressable>
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
  list: {
    maxHeight: 280,
  },
  listContent: {
    gap: Spacing.two,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  optionBody: {
    flex: 1,
    gap: Spacing.half,
  },
  button: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.6,
  },
});
