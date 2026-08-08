import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseRow } from '@/components/exercise-row';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useWorkout } from '@/context/workout-context';
import { BottomTabInset, MaxContentWidth, Radius, Spacing, TopInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function RoutineScreen() {
  const { routine, updateRoutineName, addExercise, removeExercise, updateExercise, restoreRoutine } =
    useWorkout();
  const theme = useTheme();
  const safeAreaInsets = useSafeAreaInsets();

  const totalSets = routine.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);

  const insets = {
    top: safeAreaInsets.top + TopInset,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.four,
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="caps" themeColor="textSecondary">
            Tu rutina
          </ThemedText>
          <TextInput
            value={routine.name}
            onChangeText={updateRoutineName}
            placeholder="Nombre de la rutina"
            placeholderTextColor={theme.textSecondary}
            style={[styles.nameInput, { color: theme.text }]}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {routine.exercises.length} {routine.exercises.length === 1 ? 'ejercicio' : 'ejercicios'} ·{' '}
            {totalSets} series
          </ThemedText>
        </View>

        <View style={styles.exercises}>
          {routine.exercises.map((exercise) => (
            <ExerciseRow
              key={exercise.id}
              exercise={exercise}
              onChange={(patch) => updateExercise(exercise.id, patch)}
              onDelete={() => removeExercise(exercise.id)}
            />
          ))}

          {routine.exercises.length === 0 && (
            <View style={[styles.empty, { borderColor: theme.border }]}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                Aún no tienes ejercicios. Agrega el primero para empezar.
              </ThemedText>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={addExercise}
            style={({ pressed }) => [
              styles.addButton,
              { borderColor: theme.accent },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.accent, fontSize: 18 }}>
              +
            </ThemedText>
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              Agregar ejercicio
            </ThemedText>
          </Pressable>
        </View>

        <Button
          label="Restaurar rutina de ejemplo"
          variant="ghost"
          size="md"
          onPress={restoreRoutine}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  container: {
    flex: 1,
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.two,
  },
  nameInput: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: 700,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  exercises: {
    gap: Spacing.three,
  },
  empty: {
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  centerText: {
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
