import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

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
  onDismiss: () => void;
};

const DISMISS_THRESHOLD = 80;

export function TodayPlanCard({ isLoaded, onLoadRoutine, onDismiss }: TodayPlanCardProps) {
  const theme = useTheme();
  const { schedule, routines } = useWorkout();
  const cardWidthRef = useRef(0);
  const translateX = useSharedValue(0);

  const gesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event, success) => {
      if (!success) return;
      const shouldDismiss =
        Math.abs(event.translationX) > DISMISS_THRESHOLD ||
        Math.abs(event.velocityX) > 800;
      if (shouldDismiss) {
        const direction = event.translationX >= 0 ? 1 : -1;
        const target = Math.max(cardWidthRef.current, 320) * direction;
        translateX.value = withTiming(target, { duration: 200 }, (finished) => {
          if (finished) runOnJS(onDismiss)();
        });
      } else {
        translateX.value = withTiming(0, { duration: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const todayIndex = mondayFirstIndex(new Date().getDay());
  const day = schedule[todayIndex];
  if (!day) return null;

  const routineEvent = day.events.find((event) => event.routineId);
  const event = routineEvent ?? day.events[0];
  const routine = event?.routineId
    ? routines.find((item) => item.id === event.routineId)
    : null;
  const activity = (event?.activity ?? "").trim();
  const hasPlan = day.isRest || day.events.length > 0;
  if (!hasPlan) return null;

  const timeLabel = event ? formatTime12(event.startTime.hour, event.startTime.minute) : null;

  const cardStyle = [
    styles.card,
    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
  ];
  const icon = day.isRest ? "bed-outline" : routine ? "dumbbell" : "calendar-check";

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        onLayout={(event) => {
          cardWidthRef.current = event.nativeEvent.layout.width;
        }}
        style={[cardStyle, animatedStyle]}
      >
        <View style={[styles.iconBubble, { backgroundColor: theme.accentSoft }]}>
          <MaterialCommunityIcons name={icon} size={22} color={theme.accent} />
        </View>

        <View style={styles.body}>
          <ThemedText type="caps" themeColor="textSecondary">
            {day.isRest ? "Hoy" : "Hoy toca"}
          </ThemedText>
          <ThemedText type="smallBold" numberOfLines={1}>
            {day.isRest ? "Día de descanso" : (routine?.name ?? activity ?? "Actividad")}
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quitar aviso"
          hitSlop={8}
          onPress={onDismiss}
          style={({ pressed }) => [
            styles.closeButton,
            { backgroundColor: pressed ? theme.backgroundSelected : "transparent" },
          ]}
        >
          <MaterialCommunityIcons name="close" size={20} color={theme.textSecondary} />
        </Pressable>
      </Animated.View>
    </GestureDetector>
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
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
