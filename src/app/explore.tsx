import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ExerciseRow } from "@/components/exercise-row";
import { RoutineSaveDialog } from "@/components/routine-save-dialog";
import { RoutineSidebar } from "@/components/routine-sidebar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import {
  BottomTabInset,
  MaxContentWidth,
  Radius,
  Spacing,
  TopInset,
} from "@/constants/theme";
import { useWorkout } from "@/context/workout-context";
import { useTheme } from "@/hooks/use-theme";

export default function RoutineScreen() {
  const {
    routine,
    updateRoutineName,
    addExercise,
    removeExercise,
    updateExercise,
    clearRoutine,
  } = useWorkout();
  const theme = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [saveVisible, setSaveVisible] = useState(false);
  const [newRoutineVisible, setNewRoutineVisible] = useState(false);

  const totalSets = routine.exercises.reduce(
    (sum, exercise) => sum + exercise.sets,
    0,
  );

  const insets = {
    top: safeAreaInsets.top + TopInset,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.four,
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerActions}>
              <View style={styles.headerButtons}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Nueva rutina"
                  onPress={() => setNewRoutineVisible(true)}
                  style={({ pressed }) => [
                    styles.newButton,
                    { borderColor: theme.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={18}
                    color={theme.textSecondary}
                  />
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    Nueva
                  </ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Guardar rutina"
                  onPress={() => setSaveVisible(true)}
                  style={({ pressed }) => [
                    styles.saveButton,
                    { borderColor: theme.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="content-save-outline"
                    size={18}
                    color={theme.accent}
                  />
                  <ThemedText type="smallBold" style={{ color: theme.accent }}>
                    Guardar
                  </ThemedText>
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mis rutinas"
                onPress={() => setSidebarVisible(true)}
                style={({ pressed }) => [
                  styles.menuButton,
                  pressed && styles.pressed,
                ]}
              >
                <MaterialCommunityIcons
                  name="menu"
                  size={22}
                  color={theme.text}
                />
              </Pressable>
            </View>

            <View style={{ marginTop: 10 }}>
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
                {routine.exercises.length}{" "}
                {routine.exercises.length === 1 ? "ejercicio" : "ejercicios"} ·{" "}
                {totalSets} series
              </ThemedText>
            </View>
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
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.centerText}
                >
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
              ]}
            >
              <ThemedText
                type="smallBold"
                style={{ color: theme.accent, fontSize: 18 }}
              >
                +
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                Agregar ejercicio
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <RoutineSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        onRequestSave={() => {
          setSidebarVisible(false);
          setSaveVisible(true);
        }}
      />
      <RoutineSaveDialog
        visible={saveVisible}
        onClose={() => setSaveVisible(false)}
      />

      <Modal
        visible={newRoutineVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNewRoutineVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView
            type="backgroundElement"
            style={[styles.modalCard, { borderColor: theme.border }]}
          >
            <ThemedText type="heading" style={styles.modalTitle}>
              ¿Nueva rutina?
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.modalText}
            >
              Se eliminarán todos los ejercicios de la rutina actual.
            </ThemedText>
            <View style={styles.modalActions}>
              <Button
                label="Cancelar"
                variant="ghost"
                size="md"
                onPress={() => setNewRoutineVisible(false)}
                style={styles.modalButton}
              />
              <Button
                label="Sí, nueva"
                variant="danger"
                size="md"
                onPress={() => {
                  clearRoutine();
                  setNewRoutineVisible(false);
                }}
                style={styles.modalButton}
              />
            </View>
          </ThemedView>
        </View>
      </Modal>
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
  contentContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: Spacing.five,
  },
  container: {
    flex: 1,
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    gap: Spacing.four,
    paddingTop: 40,
  },
  header: {
    gap: Spacing.two,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.half,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.half,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  menuButton: {
    padding: Spacing.one,
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
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  centerText: {
    textAlign: "center",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
  },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalTitle: {
    textAlign: "center",
  },
  modalText: {
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  modalButton: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
