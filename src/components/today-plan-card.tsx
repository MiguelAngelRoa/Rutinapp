import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { Radius, Spacing } from "@/constants/theme";
import { useWorkout } from "@/context/workout-context";
import { useTheme } from "@/hooks/use-theme";
import { mondayFirstIndex } from "@/types/workout";
import { formatTime12 } from "@/utils/format";

type TodayPlanCardProps = {
  isLoaded: boolean;
  onLoadRoutine: () => void;
};

export function TodayPlanCard({ isLoaded, onLoadRoutine }: TodayPlanCardProps) {
  const theme = useTheme();
  const { schedule, routines } = useWorkout();

  const todayIndex = mondayFirstIndex(new Date().getDay());
  const day = schedule[todayIndex];
  if (!day) return null;

  const routine = day.routineId
    ? routines.find((item) => item.id === day.routineId)
    : null;
  const activity = (day.activity ?? "").trim();
  const hasPlan = day.isRest || routine != null || activity.length > 0;
  if (!hasPlan) return null;

  const timeLabel = day.startTime
    ? formatTime12(day.startTime.hour, day.startTime.minute)
    : null;

  const cardStyle = [
    styles.card,
    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
  ];
  const icon = day.isRest ? "bed-outline" : routine ? "dumbbell" : "calendar-check";

  return (
    <View style={cardStyle}>
      <View style={[styles.iconBubble, { backgroundColor: theme.accentSoft }]}>
        <MaterialCommunityIcons name={icon} size={22} color={theme.accent} />
      </View>

      <View style={styles.body}>
        <ThemedText type="caps" themeColor="textSecondary">
          {day.isRest ? "Hoy" : "Hoy toca"}
        </ThemedText>
        <ThemedText type="smallBold" numberOfLines={1}>
          {day.isRest ? "Día de descanso" : (routine?.name ?? activity)}
        </ThemedText>
        {timeLabel && (
          <ThemedText type="small" themeColor="textSecondary">
            {timeLabel}
          </ThemedText>
        )}
      </View>

      {routine && (
        <Button
          label={isLoaded ? "Cargada" : "Cargar"}
          variant={isLoaded ? "success" : "primary"}
          size="md"
          disabled={isLoaded}
          onPress={onLoadRoutine}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    gap: Spacing.half,
  },
});
