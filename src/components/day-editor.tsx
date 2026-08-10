import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityPicker } from '@/components/activity-picker';
import { RoutinePicker } from '@/components/routine-picker';
import { ThemedText } from '@/components/themed-text';
import { TimePicker } from '@/components/time-picker';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { useWorkout } from '@/context/workout-context';
import { useTheme } from '@/hooks/use-theme';
import { createEmptyDayPlan, WEEKDAY_NAMES } from '@/types/workout';
import { formatTime12 } from '@/utils/format';

type DayEditorProps = {
  visible: boolean;
  dayIndex: number;
  onClose: () => void;
};

export function DayEditor({ visible, dayIndex, onClose }: DayEditorProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { schedule, updateDay, routines } = useWorkout();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [activityVisible, setActivityVisible] = useState(false);
  const [timeVisible, setTimeVisible] = useState(false);

  const day = schedule[dayIndex] ?? createEmptyDayPlan();
  const routine = day.routineId ? routines.find((item) => item.id === day.routineId) : null;

  const rowStyle = (pressed: boolean, disabled: boolean) => [
    styles.row,
    { borderColor: theme.border },
    disabled && styles.rowDisabled,
    pressed && !disabled && styles.pressed,
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          style={styles.backdrop}
          onPress={onClose}
        />
        {visible && (
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
                paddingBottom: insets.bottom + Spacing.four,
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: theme.border }]} />

            <View style={styles.header}>
              <ThemedText type="heading">{WEEKDAY_NAMES[dayIndex]}</ThemedText>
              <Button label="Listo" size="md" onPress={onClose} />
            </View>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={rowStyle(false, false)}>
                <View style={styles.rowBody}>
                  <ThemedText type="smallBold">Día de descanso</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    No entrenarás este día
                  </ThemedText>
                </View>
                <Switch
                  value={day.isRest}
                  onValueChange={(value) => updateDay(dayIndex, { isRest: value })}
                  trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={day.isRest}
                onPress={() => setPickerVisible(true)}
                style={({ pressed }) => rowStyle(pressed, day.isRest)}
              >
                <View style={styles.rowBody}>
                  <ThemedText type="smallBold">Rutina</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {routine ? routine.name : 'Sin rutina'}
                  </ThemedText>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={theme.textSecondary}
                />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={day.isRest}
                onPress={() => setActivityVisible(true)}
                style={({ pressed }) => rowStyle(pressed, day.isRest)}
              >
                <View style={styles.rowBody}>
                  <ThemedText type="smallBold">Actividad</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {day.activity ? day.activity : 'Sin actividad'}
                  </ThemedText>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={theme.textSecondary}
                />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={day.isRest}
                onPress={() => setTimeVisible(true)}
                style={({ pressed }) => rowStyle(pressed, day.isRest)}
              >
                <View style={styles.rowBody}>
                  <ThemedText type="smallBold">Hora</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {day.startTime
                      ? formatTime12(day.startTime.hour, day.startTime.minute)
                      : 'Sin hora'}
                  </ThemedText>
                </View>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={22}
                  color={theme.textSecondary}
                />
              </Pressable>

              <ThemedText type="caps" themeColor="textSecondary" style={styles.notesLabel}>
                Notas
              </ThemedText>
              <TextInput
                value={day.notes}
                onChangeText={(notes) => updateDay(dayIndex, { notes })}
                placeholder="Notas del día (opcional)"
                placeholderTextColor={theme.textSecondary}
                multiline
                style={[styles.notesInput, { color: theme.text, borderColor: theme.border }]}
              />

              <Button
                label="Restablecer día"
                variant="ghost"
                size="md"
                onPress={() => updateDay(dayIndex, createEmptyDayPlan())}
              />
            </ScrollView>

            {pickerVisible && (
              <RoutinePicker
                selectedId={day.routineId}
                onSelect={(routineId) => {
                  updateDay(dayIndex, { routineId, activity: '' });
                  setPickerVisible(false);
                }}
                onCancel={() => setPickerVisible(false)}
              />
            )}
            {activityVisible && (
              <ActivityPicker
                selected={day.activity}
                onSelect={(activity) => {
                  updateDay(dayIndex, activity ? { activity, routineId: null } : { activity });
                  setActivityVisible(false);
                }}
                onCancel={() => setActivityVisible(false)}
              />
            )}
            {timeVisible && (
              <TimePicker
                initialTime={day.startTime}
                onConfirm={(startTime) => {
                  updateDay(dayIndex, { startTime });
                  setTimeVisible(false);
                }}
                onCancel={() => setTimeVisible(false)}
              />
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  sheetScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  sheetContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  rowBody: {
    flex: 1,
    gap: Spacing.half,
  },
  notesLabel: {
    marginTop: Spacing.two,
  },
  notesInput: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  pressed: {
    opacity: 0.6,
  },
});
