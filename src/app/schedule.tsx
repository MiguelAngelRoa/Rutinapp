import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DayEditor } from "@/components/day-editor";
import { ThemedText } from "@/components/themed-text";
import {
  BottomTabInset,
  MaxContentWidth,
  Radius,
  Spacing,
  TopInset,
} from "@/constants/theme";
import { useWorkout } from "@/context/workout-context";
import { useTheme } from "@/hooks/use-theme";
import { mondayFirstIndex, WEEKDAY_NAMES } from "@/types/workout";
import { formatTime12 } from "@/utils/format";

export default function ScheduleScreen() {
  const theme = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const { schedule, routines } = useWorkout();
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [pressedDay, setPressedDay] = useState<number | null>(null);

  const todayIndex = mondayFirstIndex(new Date().getDay());
  const trainingCount = schedule.filter((day) => !day.isRest && day.events.length > 0).length;
  const restCount = schedule.filter((day) => day.isRest).length;

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
            <ThemedText type="caps" themeColor="textSecondary">
              Agenda
            </ThemedText>
            <ThemedText type="heading">Mi semana</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {trainingCount} {trainingCount === 1 ? "entreno" : "entrenos"} · {restCount}{" "}
              {restCount === 1 ? "descanso" : "descansos"}
            </ThemedText>
          </View>

          <View style={styles.days}>
            {schedule.map((day, index) => {
              const isToday = index === todayIndex;
              return (
                <Pressable
                  key={index}
                  accessibilityRole="button"
                  onPress={() => setEditingDay(index)}
                  onPressIn={() => setPressedDay(index)}
                  onPressOut={() => setPressedDay(null)}
                  android_ripple={{ color: "rgba(163, 230, 53, 0.3)", borderless: false }}
                  style={[
                    styles.dayCard,
                    {
                      borderColor: pressedDay === index || isToday ? theme.accent : theme.border,
                      backgroundColor:
                        pressedDay === index
                          ? "rgba(163, 230, 53, 0.5)"
                          : isToday
                            ? theme.backgroundSelected
                            : "transparent",
                    },
                  ]}
                >
                  <View style={styles.dayHeader}>
                    <View style={styles.dayTitleRow}>
                      <ThemedText type="smallBold">{WEEKDAY_NAMES[index]}</ThemedText>
                      {isToday && (
                        <ThemedText
                          type="caps"
                          style={[styles.badge, { color: theme.accent, borderColor: theme.accent }]}
                        >
                          Hoy
                        </ThemedText>
                      )}
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color={theme.textSecondary}
                    />
                  </View>

                  {day.isRest ? (
                    <ThemedText
                      type="smallBold"
                      style={[styles.badge, { color: theme.accent, borderColor: theme.accent }]}
                    >
                      Descanso
                    </ThemedText>
                  ) : day.events.length > 0 ? (
                    <View style={styles.dayInfo}>
                      {day.events.slice(0, 3).map((event) => {
                        const label = event.routineId
                          ? routines.find((item) => item.id === event.routineId)?.name
                          : event.activity;
                        return (
                          <View key={event.id} style={styles.eventRow}>
                            <ThemedText
                              type="small"
                              themeColor="textSecondary"
                              style={styles.eventTime}
                            >
                              {formatTime12(event.startTime.hour, event.startTime.minute)}
                            </ThemedText>
                            <ThemedText type="smallBold" numberOfLines={1}>
                              {label}
                            </ThemedText>
                          </View>
                        );
                      })}
                      {day.events.length > 3 && (
                        <ThemedText type="small" themeColor="textSecondary">
                          +{day.events.length - 3} más
                        </ThemedText>
                      )}
                    </View>
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary">
                      Sin asignar
                    </ThemedText>
                  )}

                  {day.notes ? (
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      numberOfLines={1}
                      style={styles.note}
                    >
                      {day.notes}
                    </ThemedText>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <DayEditor
        visible={editingDay != null}
        dayIndex={editingDay ?? 0}
        onClose={() => setEditingDay(null)}
      />
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
  days: {
    gap: Spacing.three,
  },
  dayCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  badge: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    overflow: "hidden",
  },
  dayInfo: {
    gap: Spacing.half,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  eventTime: {
    fontVariant: ["tabular-nums"],
    width: 64,
  },
  note: {
    color: "#9CA3AF",
  },
});
