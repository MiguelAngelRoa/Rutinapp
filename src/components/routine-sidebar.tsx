import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { useWorkout } from '@/context/workout-context';
import { useTheme } from '@/hooks/use-theme';
import type { SavedRoutine } from '@/types/workout';
import { pickRoutineFromDocumentPicker } from '@/utils/pick-routine-file';
import { shareRoutineFile } from '@/utils/share-routine';

type RoutineSidebarProps = {
  visible: boolean;
  onClose: () => void;
  onRequestSave: () => void;
};

export function RoutineSidebar({ visible, onClose, onRequestSave }: RoutineSidebarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { routines, activeRoutineId, routine, setPendingImport, loadRoutine, deleteRoutine } =
    useWorkout();

  const panelWidth = Math.min(340, Math.round(width * 0.86));
  const translateX = useRef(new Animated.Value(-panelWidth)).current;

  const [deleteTarget, setDeleteTarget] = useState<SavedRoutine | null>(null);
  const [sharing, setSharing] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setDeleteTarget(null);
      return;
    }
    translateX.setValue(-panelWidth);
    Animated.timing(translateX, { toValue: 0, duration: 240, useNativeDriver: true }).start();
  }, [visible, translateX, panelWidth]);

  const handleDelete = () => {
    if (deleteTarget == null) return;
    deleteRoutine(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleLoad = (id: string) => {
    loadRoutine(id);
    onClose();
  };

  const handleShare = async () => {
    if (sharing || routine.exercises.length === 0) return;
    setSharing(true);
    try {
      const result = await shareRoutineFile(routine);
      if (result === 'unavailable') {
        Alert.alert(
          'No se pudo compartir',
          'Compartir no está disponible en este dispositivo. Prueba a importar el archivo desde otra app.',
        );
      }
    } finally {
      setSharing(false);
    }
  };

  const handleImport = async () => {
    if (importing) return;
    setImporting(true);
    try {
      const result = await pickRoutineFromDocumentPicker();
      if (result.status === 'ok') {
        setPendingImport(result.routine);
      } else if (result.status === 'invalid') {
        Alert.alert(
          'Archivo no válido',
          'El archivo seleccionado no contiene una rutina válida de Rutinapp.',
        );
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar menú"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.panel,
            {
              width: panelWidth,
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
              paddingTop: insets.top + Spacing.three,
              paddingBottom: insets.bottom + Spacing.four,
              transform: [{ translateX }],
            },
          ]}>
          <View style={styles.headerRow}>
            <ThemedText type="heading">Mis rutinas</ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <MaterialCommunityIcons name="close" size={22} color={theme.text} />
            </Pressable>
          </View>

          <Button label="Guardar rutina actual" size="md" onPress={onRequestSave} />

          <View style={styles.transferButtons}>
            <Button
              label="Compartir"
              size="md"
              variant="outline"
              disabled={sharing || routine.exercises.length === 0}
              onPress={handleShare}
              style={styles.transferButton}
            />
            <Button
              label="Importar"
              size="md"
              variant="outline"
              disabled={importing}
              onPress={handleImport}
              style={styles.transferButton}
            />
          </View>

          <ThemedText type="caps" themeColor="textSecondary" style={styles.listTitle}>
            Guardadas
          </ThemedText>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}>
            {routines.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                Aún no tienes rutinas guardadas.
              </ThemedText>
            ) : (
              routines.map((item) => {
                const isActive = item.id === activeRoutineId;
                const totalSets = item.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.row,
                      {
                        borderColor: isActive ? theme.accent : theme.border,
                        backgroundColor: isActive ? theme.backgroundSelected : 'transparent',
                      },
                    ]}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleLoad(item.id)}
                      style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}>
                      <View style={styles.rowBody}>
                        <ThemedText
                          type="smallBold"
                          numberOfLines={1}
                          style={[isActive && { color: theme.accent }]}>
                          {item.name}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {item.exercises.length}{' '}
                          {item.exercises.length === 1 ? 'ejercicio' : 'ejercicios'} ·{' '}
                          {totalSets} series
                        </ThemedText>
                      </View>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Eliminar ${item.name}`}
                      onPress={() => setDeleteTarget(item)}
                      style={({ pressed }) => [styles.rowDelete, pressed && styles.pressed]}>
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={20}
                        color={theme.textSecondary}
                      />
                    </Pressable>
                  </View>
                );
              })
            )}
          </ScrollView>

          {deleteTarget != null && (
            <View style={styles.dialogOverlay}>
              <View style={styles.dialogCenter}>
                <ThemedView
                  type="backgroundElement"
                  style={[styles.dialogCard, { borderColor: theme.border }]}>
                  <ThemedText type="heading" style={styles.dialogTitle}>
                    Eliminar «{deleteTarget.name}»
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.dialogText}>
                    Esta acción no se puede deshacer.
                  </ThemedText>
                  <View style={styles.dialogActions}>
                    <Button
                      label="Cancelar"
                      variant="ghost"
                      size="md"
                      onPress={() => setDeleteTarget(null)}
                      style={styles.dialogButton}
                    />
                    <Button
                      label="Eliminar"
                      variant="danger"
                      size="md"
                      onPress={handleDelete}
                      style={styles.dialogButton}
                    />
                  </View>
                </ThemedView>
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRightWidth: 1,
    paddingHorizontal: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  closeButton: {
    padding: Spacing.one,
  },
  transferButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  transferButton: {
    flex: 1,
  },
  listTitle: {
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  rowMain: {
    flex: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  rowBody: {
    gap: Spacing.half,
  },
  rowDelete: {
    padding: Spacing.three,
  },
  dialogOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  dialogCenter: {
    width: '100%',
    justifyContent: 'center',
  },
  dialogCard: {
    width: '100%',
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  dialogTitle: {
    textAlign: 'center',
  },
  dialogText: {
    textAlign: 'center',
  },
  dialogActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dialogButton: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
