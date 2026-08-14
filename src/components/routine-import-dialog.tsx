import { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { LoadingModal } from '@/components/ui/loading-modal';
import { Radius, Spacing } from '@/constants/theme';
import { useWorkout } from '@/context/workout-context';
import { useTheme } from '@/hooks/use-theme';
import type { Routine } from '@/types/workout';

const MIN_APPLY_DURATION_MS = 600;

export function RoutineImportDialog() {
  const theme = useTheme();
  const { pendingImport, setPendingImport, routines, importRoutine } = useWorkout();
  const [overwriteName, setOverwriteName] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const routine = pendingImport;
  const visible = routine != null;

  useEffect(() => {
    if (visible) setOverwriteName(null);
  }, [visible]);

  const exists = routine != null && routines.some((item) => item.name === routine.name);

  const handleClose = () => {
    setPendingImport(null);
  };

  const runImport = async (target: Routine) => {
    setIsApplying(true);
    try {
      importRoutine(target);
      await new Promise((resolve) => setTimeout(resolve, MIN_APPLY_DURATION_MS));
    } finally {
      setIsApplying(false);
      handleClose();
    }
  };

  const handleConfirm = () => {
    if (routine == null) return;
    if (exists) {
      setOverwriteName(routine.name);
      return;
    }
    runImport(routine);
  };

  const handleOverwrite = () => {
    if (routine == null) return;
    setOverwriteName(null);
    runImport(routine);
  };

  if (!visible) return null;

  const totalSets = routine.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);

  return (
    <>
      <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={handleClose}>
        <View style={styles.overlay}>
          {overwriteName == null ? (
            <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
              <ThemedText type="heading" style={styles.title}>
                Importar rutina
              </ThemedText>

              <View style={styles.preview}>
                <ThemedText type="smallBold" numberOfLines={1} style={styles.previewName}>
                  {routine.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {routine.exercises.length}{' '}
                  {routine.exercises.length === 1 ? 'ejercicio' : 'ejercicios'} · {totalSets} series
                </ThemedText>
              </View>

              {exists && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                  Ya existe «{routine.name}». Se te pedirá confirmación para sobrescribirla.
                </ThemedText>
              )}

              <View style={styles.actions}>
                <Button
                  label="Cancelar"
                  variant="ghost"
                  size="md"
                  onPress={handleClose}
                  style={styles.actionButton}
                />
                <Button
                  label="Importar"
                  size="md"
                  onPress={handleConfirm}
                  style={styles.actionButton}
                />
              </View>
            </ThemedView>
          ) : (
            <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
              <ThemedText type="heading" style={styles.title}>
                Sobrescribir «{overwriteName}»
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                Ya existe una rutina guardada con ese nombre. ¿Quieres reemplazarla
                con la versión importada?
              </ThemedText>
              <View style={styles.actions}>
                <Button
                  label="Cancelar"
                  variant="ghost"
                  size="md"
                  onPress={() => setOverwriteName(null)}
                  style={styles.actionButton}
                />
                <Button
                  label="Sobrescribir"
                  size="md"
                  onPress={handleOverwrite}
                  style={styles.actionButton}
                />
              </View>
            </ThemedView>
          )}
        </View>
      </Modal>
      <LoadingModal visible={isApplying} />
    </>
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
    width: '100%',
    maxWidth: 400,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  preview: {
    gap: Spacing.half,
  },
  previewName: {
    fontSize: 16,
  },
  hint: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
  },
});
