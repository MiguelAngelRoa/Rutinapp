import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { Modal, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import {
  modeHomeRoute,
  useMode,
  type AppMode,
} from "@/context/mode-context";
import { useTheme } from "@/hooks/use-theme";

type ModeMenuProps = {
  visible: boolean;
  onClose: () => void;
};

type ModeOption = {
  mode: AppMode;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  title: string;
};

const MODE_OPTIONS: ModeOption[] = [
  { mode: "entrenar", icon: "dumbbell", title: "Rutina" },
  { mode: "runner", icon: "run", title: "Runner" },
];

export function ModeMenu({ visible, onClose }: ModeMenuProps) {
  const theme = useTheme();
  const { mode, setMode } = useMode();

  const select = (next: AppMode) => {
    if (next !== mode) setMode(next);
    onClose();
    router.navigate(modeHomeRoute(next));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        accessibilityLabel="Cerrar menú de modos"
      >
        <ThemedView
          type="backgroundElement"
          style={[styles.card, { borderColor: theme.border }]}
        >
          <ThemedText type="caps" themeColor="textSecondary" style={styles.title}>
            Elegir modo
          </ThemedText>

          {MODE_OPTIONS.map((option) => {
            const active = mode === option.mode;
            return (
              <Pressable
                key={option.mode}
                accessibilityRole="button"
                onPress={() => select(option.mode)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    borderColor: active ? theme.accent : theme.border,
                    backgroundColor: active
                      ? theme.accentSoft
                      : theme.backgroundSelected,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <MaterialCommunityIcons
                  name={option.icon}
                  size={22}
                  color={active ? theme.accent : theme.textSecondary}
                />
                <ThemedText
                  type="smallBold"
                  themeColor={active ? "text" : "textSecondary"}
                  style={styles.optionLabel}
                >
                  {option.title}
                </ThemedText>
                {active && (
                  <MaterialCommunityIcons
                    name="check"
                    size={18}
                    color={theme.accent}
                  />
                )}
              </Pressable>
            );
          })}
        </ThemedView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "stretch",
    paddingHorizontal: Spacing.four,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
  },
  card: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 320,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    marginBottom: Spacing.two,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  optionLabel: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});