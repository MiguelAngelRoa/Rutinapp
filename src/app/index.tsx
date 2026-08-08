import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { RestTimer } from '@/components/rest-timer';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useWorkout } from '@/context/workout-context';
import { BottomTabInset, MaxContentWidth, Radius, Spacing, TopInset } from '@/constants/theme';
import { useRestTimer } from '@/hooks/use-rest-timer';
import { useTheme } from '@/hooks/use-theme';
import type { Routine } from '@/types/workout';

export default function TrainScreen() {
  const { routine } = useWorkout();
  const [sessionRoutine, setSessionRoutine] = useState<Routine>(routine);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState(0);
  const [done, setDone] = useState(false);
  const restTimer = useRestTimer();
  const theme = useTheme();
  const safeAreaInsets = useSafeAreaInsets();

  const heroMode = restTimer.phase === 'idle' ? 0 : restTimer.phase === 'finished' ? 2 : 1;
  const heroModeValue = useSharedValue(heroMode);

  useEffect(() => {
    heroModeValue.value = withTiming(heroMode, { duration: 300 });
  }, [heroMode, heroModeValue]);

  const heroAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(heroModeValue.value, [0, 1, 2], [
      theme.backgroundElement,
      theme.accent,
      theme.success,
    ]),
    borderColor: interpolateColor(heroModeValue.value, [0, 1, 2], [
      theme.border,
      theme.accent,
      theme.success,
    ]),
  }));

  const heroInfoOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(heroModeValue.value, [0, 1, 2], [1, 0, 0]),
  }));

  const heroRestOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(heroModeValue.value, [0, 1, 2], [0, 1, 1]),
  }));

  const exercise = sessionRoutine.exercises[exerciseIndex];
  const isLastExercise = exerciseIndex >= sessionRoutine.exercises.length - 1;
  const allSetsDone = exercise != null && completedSets >= exercise.sets;

  const totalSets = sessionRoutine.exercises.reduce((sum, item) => sum + item.sets, 0);
  const completedSetsBefore = sessionRoutine.exercises
    .slice(0, exerciseIndex)
    .reduce((sum, item) => sum + item.sets, 0);
  const completedSetsTotal = completedSetsBefore + completedSets;
  const sessionProgress = totalSets > 0 ? completedSetsTotal / totalSets : 0;

  useEffect(() => {
    if (restTimer.phase === 'finished' && Platform.OS !== 'web') {
      Vibration.vibrate(400);
    }
  }, [restTimer.phase]);

  const completeSet = () => {
    if (exercise == null) return;
    setCompletedSets((count) => count + 1);
    restTimer.start(exercise.restSeconds);
  };

  const advance = () => {
    if (allSetsDone && isLastExercise) {
      setDone(true);
    } else if (allSetsDone) {
      setExerciseIndex((index) => index + 1);
      setCompletedSets(0);
    }
    restTimer.stop();
  };

  const resetSession = () => {
    setSessionRoutine(routine);
    setExerciseIndex(0);
    setCompletedSets(0);
    setDone(false);
    restTimer.stop();
  };

  const getPrimaryLabel = () => {
    if (restTimer.phase === 'resting') return 'Saltar descanso';
    if (restTimer.phase === 'finished') {
      return allSetsDone
        ? isLastExercise
          ? 'Terminar rutina'
          : 'Siguiente ejercicio'
        : 'Siguiente serie';
    }
    if (allSetsDone) {
      return isLastExercise ? 'Terminar rutina' : 'Siguiente ejercicio';
    }
    return `Completar serie ${completedSets + 1} de ${exercise?.sets ?? 0}`;
  };

  const handlePrimary = () => {
    if (restTimer.phase === 'resting') {
      restTimer.stop();
      return;
    }
    if (restTimer.phase === 'finished') {
      advance();
      return;
    }
    if (allSetsDone) {
      advance();
      return;
    }
    completeSet();
  };

  const insets = {
    top: safeAreaInsets.top + TopInset,
  };

  const showControls = !done && sessionRoutine.exercises.length > 0 && exercise != null;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: insets.top, paddingBottom: safeAreaInsets.bottom + Spacing.four },
        ]}>
        <View style={styles.container}>
          {done ? (
            <CompletionView totalSets={totalSets} onRestart={resetSession} />
          ) : sessionRoutine.exercises.length === 0 ? (
            <EmptyView />
          ) : (
            exercise != null && (
              <View style={styles.stack}>
                <View style={styles.header}>
                  <ThemedText type="caps" themeColor="textSecondary">
                    Sesión de entrenamiento
                  </ThemedText>
                  <ThemedText type="heading">{sessionRoutine.name}</ThemedText>

                  <View style={styles.progressRow}>
                    <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
                      <View
                        style={[
                          styles.progressFill,
                          { backgroundColor: theme.accent, width: `${sessionProgress * 100}%` },
                        ]}
                      />
                    </View>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.progressLabel}>
                      {completedSetsTotal}/{totalSets} series
                    </ThemedText>
                  </View>
                </View>

                <Animated.View style={[styles.hero, heroAnimatedStyle]}>
                  <Animated.View style={[styles.heroInfo, heroInfoOpacity]}>
                    <View style={[styles.heroChip, { backgroundColor: theme.accentSoft }]}>
                      <ThemedText type="caps" style={[styles.heroChipText, { color: theme.accent }]}>
                        {allSetsDone
                          ? 'Series completadas'
                          : `Serie ${completedSets + 1} de ${exercise.sets}`}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.heroTitle}>
                      {exercise.name || 'Sin nombre'}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" style={styles.heroMeta}>
                      {exercise.reps} reps por serie
                    </ThemedText>
                    <SetDots total={exercise.sets} completed={completedSets} />
                    <RestTimer
                      phase="idle"
                      remainingSeconds={restTimer.remainingSeconds}
                      durationSeconds={exercise.restSeconds}
                    />
                  </Animated.View>

                  <Animated.View
                    pointerEvents={restTimer.phase === 'idle' ? 'none' : 'auto'}
                    style={[styles.heroOverlay, heroRestOpacity]}>
                    <RestTimer
                      phase={restTimer.phase}
                      remainingSeconds={restTimer.remainingSeconds}
                      durationSeconds={exercise.restSeconds}
                    />
                  </Animated.View>
                </Animated.View>
              </View>
            )
          )}
        </View>
      </ScrollView>

      {showControls && (
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: theme.background,
              paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.four,
            },
          ]}>
          <View style={styles.bottomBarContent}>
            <Button
              label={getPrimaryLabel()}
              variant={restTimer.phase === 'finished' ? 'success' : 'primary'}
              onPress={handlePrimary}
            />
          </View>
        </View>
      )}
    </View>
  );
}

type SetDotsProps = {
  total: number;
  completed: number;
};

function SetDots({ total, completed }: SetDotsProps) {
  const theme = useTheme();
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }, (_, index) => {
        const isDone = index < completed;
        const isCurrent = index === completed;
        return (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: isDone ? theme.accent : theme.backgroundSelected,
                borderColor: isCurrent ? theme.accent : theme.backgroundSelected,
                borderWidth: isCurrent ? 2 : 0,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function CompletionView({ totalSets, onRestart }: { totalSets: number; onRestart: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <View style={[styles.doneBadge, { backgroundColor: theme.successSoft }]}>
        <ThemedText type="heading" style={{ color: theme.success }}>
          ✓
        </ThemedText>
      </View>
      <ThemedText type="heading" style={styles.centerText}>
        ¡Rutina completada!
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
        Completaste {totalSets} series. Buen trabajo.
      </ThemedText>
      <Button label="Empezar de nuevo" onPress={onRestart} style={styles.restartButton} />
    </View>
  );
}

function EmptyView() {
  return (
    <View style={styles.center}>
      <ThemedText type="heading" style={styles.centerText}>
        Tu rutina está vacía
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
        Agrega ejercicios en la pestaña «Rutina» para empezar a entrenar.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  bottomBar: {
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
  },
  bottomBarContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
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
  },
  stack: {
    flex: 1,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.two,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    flex: 1,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressLabel: {
    fontVariant: ['tabular-nums'],
  },
  hero: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  heroInfo: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroChip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
  },
  heroChipText: {
    color: '#A3E635',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: 700,
    textAlign: 'center',
  },
  heroMeta: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.six,
  },
  centerText: {
    textAlign: 'center',
  },
  doneBadge: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restartButton: {
    marginTop: Spacing.two,
  },
});
