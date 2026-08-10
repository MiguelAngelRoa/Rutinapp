import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { useWorkout } from '@/context/workout-context';
import { useTheme } from '@/hooks/use-theme';

type RoutineSaveDialogProps = {
  visible: boolean;
  onClose: () => void;
};

export function RoutineSaveDialog({ visible, onClose }: RoutineSaveDialogProps) {
  const theme = useTheme();
  const { routine, routines, saveRoutine } = useWorkout();
  const [name, setName] = useState('');
  const [overwriteName, setOverwriteName] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(routine.name);
      setOverwriteName(null);
    }
  }, [visible, routine.name]);

  const trimmed = name.trim();
  const exists =
    trimmed.length > 0 && routines.some((item) => item.name === trimmed);

  const handleSave = () => {
    if (!trimmed) return;
    if (exists) {
      setOverwriteName(trimmed);
      return;
    }
    saveRoutine(trimmed);
    onClose();
  };

  const handleOverwrite = () => {
    if (overwriteName == null) return;
    saveRoutine(overwriteName);
    setOverwriteName(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        {overwriteName == null ? (
          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="heading" style={styles.title}>
              Guardar rutina
            </ThemedText>
            <TextInput
              autoFocus
              value={name}
              onChangeText={setName}
              onSubmitEditing={handleSave}
              placeholder="Nombre de la rutina"
              placeholderTextColor={theme.textSecondary}
              returnKeyType="done"
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            />
            {exists && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                Ya existe «{trimmed}». Se te pedirá confirmación para sobrescribirla.
              </ThemedText>
            )}
            <View style={styles.actions}>
              <Button
                label="Cancelar"
                variant="ghost"
                size="md"
                onPress={onClose}
                style={styles.actionButton}
              />
              <Button
                label="Guardar"
                size="md"
                disabled={!trimmed}
                onPress={handleSave}
                style={styles.actionButton}
              />
            </View>
          </ThemedView>
        ) : (
          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="heading" style={styles.title}>
              Sobrescribir «{overwriteName}»
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
              Ya existe una rutina guardada con ese nombre. ¿Quieres reemplazarla
              con la versión actual?
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
      </KeyboardAvoidingView>
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
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
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
