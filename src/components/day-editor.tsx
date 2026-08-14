import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { ActivityPicker } from '@/components/activity-picker';
import { RoutinePicker } from '@/components/routine-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { useWorkout } from '@/context/workout-context';
import { useTheme } from '@/hooks/use-theme';
import { createEmptyDayPlan, WEEKDAY_NAMES, type DayEvent } from '@/types/workout';
import { formatTime12 } from '@/utils/format';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const ROW_HEIGHT = 56;
const GRID_HEIGHT = HOURS.length * ROW_HEIGHT;
/** Width of the hour-label rail (matches the timeline axis position). */
const LABEL_WIDTH = 76;
const LONG_PRESS_MS = 300;
const TOUCH_SLOP = 12;

type DayEditorProps = {
  visible: boolean;
  dayIndex: number;
  onClose: () => void;
};

/** Range selected on the grid; `eventId` is set when editing an existing cell. */
type SlotDraft = {
  fromHour: number;
  toHour: number;
  eventId: string | null;
};

/** Hours spanned by an event, with midnight wrap handled. */
function eventSpanHours(event: DayEvent): number {
  return Math.max(1, (event.endTime.hour - event.startTime.hour + 24) % 24);
}

function hourInSpan(event: DayEvent, hour: number): boolean {
  const start = event.startTime.hour;
  const end = (start + eventSpanHours(event)) % 24;
  if (start <= end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

function clampHour(hour: number): number {
  return Math.min(HOURS.length - 1, Math.max(0, hour));
}

export function DayEditor({ visible, dayIndex, onClose }: DayEditorProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { schedule, updateDay, addDayEvent, updateDayEvent, removeDayEvent, resetDay } =
    useWorkout();
  const [draft, setDraft] = useState<SlotDraft | null>(null);
  const [routinePickerVisible, setRoutinePickerVisible] = useState(false);
  const [activityPickerVisible, setActivityPickerVisible] = useState(false);
  const [selectionActive, setSelectionActive] = useState(false);
  const [pressedHour, setPressedHour] = useState<number | null>(null);
  const [debugText, setDebugText] = useState('');
  const selectionRef = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armedRef = useRef(false);
  const touchStartY = useRef(0);
  const touchMoved = useRef(0);
  const selectionStartHour = useRef<number | null>(null);
  const bandTop = useSharedValue(0);
  const bandHeight = useSharedValue(0);
  const gridBodyRef = useRef<View>(null);
  const gridBodyWindowY = useRef(0);

  const day = schedule[dayIndex] ?? createEmptyDayPlan();
  const now = new Date();
  const currentHour = now.getHours();
  const nowOffset = (now.getMinutes() / 60) * ROW_HEIGHT;

  const closeChooser = () => setDraft(null);
  const chooserTitle = draft?.eventId ? 'Editar evento' : '¿Qué vas a hacer?';

  const beginSelection = () => {
    selectionRef.current = true;
    setSelectionActive(true);
  };

  const endSelection = () => {
    selectionRef.current = false;
    setSelectionActive(false);
  };

  const finishSelection = (from: number, to: number, startRow: number) => {
    endSelection();
    const existing = day.events.find((event) => hourInSpan(event, startRow));
    if (existing) {
      setDraft({
        fromHour: existing.startTime.hour,
        toHour: (existing.startTime.hour + eventSpanHours(existing) - 1) % 24,
        eventId: existing.id,
      });
      return;
    }
    setDraft({ fromHour: from, toHour: to, eventId: null });
  };

  const clearLongPressTimer = () => {
    if (longPressTimer.current != null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const onGridTouchStart = (e: GestureResponderEvent) => {
    clearLongPressTimer();
    armedRef.current = false;
    touchStartY.current = e.nativeEvent.locationY;
    touchMoved.current = 0;
    gridBodyRef.current?.measureInWindow((_x, y) => {
      gridBodyWindowY.current = y;
    });
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      if (touchMoved.current <= TOUCH_SLOP) {
        armedRef.current = true;
        setSelectionActive(true);
        setDebugText('armado');
      }
    }, LONG_PRESS_MS);
  };

  const onGridTouchMove = (e: GestureResponderEvent) => {
    touchMoved.current = Math.max(
      touchMoved.current,
      Math.abs(e.nativeEvent.locationY - touchStartY.current),
    );
  };

  const onGridTouchEnd = () => {
    clearLongPressTimer();
    if (armedRef.current) {
      armedRef.current = false;
      if (!selectionRef.current) endSelection();
    }
  };

  const onGridMoveShouldSetResponder = () => armedRef.current;

  const rowFromPageY = (pageY: number) =>
    clampHour(Math.floor((pageY - gridBodyWindowY.current) / ROW_HEIGHT));

  const onGridResponderGrant = (e: GestureResponderEvent) => {
    clearLongPressTimer();
    const row = rowFromPageY(e.nativeEvent.pageY);
    selectionStartHour.current = row;
    bandTop.value = row * ROW_HEIGHT;
    bandHeight.value = ROW_HEIGHT;
    beginSelection();
    setDebugText(
      `start row=${row} pageY=${Math.round(e.nativeEvent.pageY)} winY=${Math.round(
        gridBodyWindowY.current,
      )}`,
    );
  };

  const onGridResponderMove = (e: GestureResponderEvent) => {
    const start = selectionStartHour.current ?? 0;
    const current = rowFromPageY(e.nativeEvent.pageY);
    const from = Math.min(start, current);
    const to = Math.max(start, current);
    bandTop.value = from * ROW_HEIGHT;
    bandHeight.value = (to - from + 1) * ROW_HEIGHT;
    setDebugText(`move row=${current} from=${from} to=${to}`);
  };

  const onGridResponderRelease = (e: GestureResponderEvent) => {
    clearLongPressTimer();
    armedRef.current = false;
    const start = selectionStartHour.current;
    selectionStartHour.current = null;
    if (start == null) return;
    const current = rowFromPageY(e.nativeEvent.pageY);
    const from = Math.min(start, current);
    const to = Math.max(start, current);
    bandTop.value = 0;
    bandHeight.value = 0;
    finishSelection(from, to, start);
    setDebugText(`release from=${from} to=${to}`);
  };

  const onGridResponderTerminate = () => {
    clearLongPressTimer();
    armedRef.current = false;
    selectionStartHour.current = null;
    bandTop.value = 0;
    bandHeight.value = 0;
    endSelection();
    setDebugText('cancelado');
  };

  const bandStyle = useAnimatedStyle(() => ({
    top: bandTop.value,
    height: bandHeight.value,
    opacity: bandHeight.value > 0 ? 1 : 0,
  }));

  const handleRowPress = (hour: number) => {
    if (selectionRef.current || selectionActive) return;
    const existing = day.events.find((event) => hourInSpan(event, hour));
    if (existing) {
      setDraft({
        fromHour: existing.startTime.hour,
        toHour: (existing.startTime.hour + eventSpanHours(existing) - 1) % 24,
        eventId: existing.id,
      });
      return;
    }
    setDraft({ fromHour: hour, toHour: hour, eventId: null });
  };

  const handleAddEvent = (event: { routineId: string | null; activity: string }) => {
    if (!draft) return;
    if (draft.eventId) {
      updateDayEvent(dayIndex, draft.eventId, event);
    } else {
      addDayEvent(dayIndex, {
        startTime: { hour: draft.fromHour, minute: 0 },
        endTime: { hour: (draft.toHour + 1) % 24, minute: 0 },
        ...event,
      });
    }
    closeChooser();
  };

  const handleDeleteEvent = () => {
    if (draft?.eventId) removeDayEvent(dayIndex, draft.eventId);
    closeChooser();
  };

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
      <View style={styles.sheetRoot}>
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
              scrollEnabled={!selectionActive}
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

              {!day.isRest ? (
                <View style={styles.schedule}>
                  <ThemedText type="caps" themeColor="textSecondary" style={styles.scheduleLabel}>
                    Toca una hora, o mantén presionado y arrastra para fijar la duración
                  </ThemedText>
                  <View style={[styles.grid, { borderColor: theme.border }]}>
                    <View
                      ref={gridBodyRef}
                      style={styles.gridBody}
                      collapsable={false}
                      onTouchStart={onGridTouchStart}
                      onTouchMove={onGridTouchMove}
                      onTouchEnd={onGridTouchEnd}
                      onTouchCancel={onGridTouchEnd}
                      onMoveShouldSetResponder={onGridMoveShouldSetResponder}
                      onResponderGrant={onGridResponderGrant}
                      onResponderMove={onGridResponderMove}
                      onResponderRelease={onGridResponderRelease}
                      onResponderTerminate={onGridResponderTerminate}
                    >
                        {HOURS.map((hour) => {
                          const isNow = hour === currentHour;
                          return (
                            <View
                              key={hour}
                              style={[styles.hourRow, { borderBottomColor: theme.border }]}
                            >
                              <View style={styles.labelCol}>
                                <ThemedText
                                  type="small"
                                  style={[
                                    styles.hourLabel,
                                    { color: isNow ? theme.accent : theme.textSecondary },
                                  ]}
                                >
                                  {formatTime12(hour, 0)}
                                </ThemedText>
                              </View>
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`Añadir evento a las ${formatTime12(hour, 0)}`}
                                onPress={() => handleRowPress(hour)}
                                onPressIn={() => setPressedHour(hour)}
                                onPressOut={() => setPressedHour(null)}
                                style={[
                                  styles.dayCol,
                                  { borderLeftColor: theme.border },
                                  pressedHour === hour && {
                                    backgroundColor: "rgba(163, 230, 53, 0.25)",
                                  },
                                ]}
                              />
                            </View>
                          );
                        })}

                        {day.events.map((event) => (
                          <EventBlock
                            key={event.id}
                            event={event}
                            onPress={() =>
                              setDraft({
                                fromHour: event.startTime.hour,
                                toHour: (event.startTime.hour + eventSpanHours(event) - 1) % 24,
                                eventId: event.id,
                              })
                            }
                          />
                        ))}

                        <Animated.View
                          pointerEvents="none"
                          style={[
                            styles.selectionBand,
                            bandStyle,
                            {
                              backgroundColor: "rgba(163, 230, 53, 0.35)",
                              borderLeftColor: theme.accent,
                            },
                          ]}
                        />

                        <View pointerEvents="none" style={styles.nowLayer}>
                            <View
                              style={[
                                styles.nowDot,
                                {
                                  top: currentHour * ROW_HEIGHT + nowOffset - 3,
                                  backgroundColor: theme.accent,
                                },
                              ]}
                            />
                            <View
                              style={[
                                styles.nowLine,
                                {
                                  top: currentHour * ROW_HEIGHT + nowOffset,
                                  backgroundColor: theme.accent,
                                },
                              ]}
                            />
                        </View>
                      </View>
                  </View>
                </View>
              ) : (
                <ThemedText type="small" themeColor="textSecondary" style={styles.restHint}>
                  Este día está marcado como descanso. Desactiva el interruptor para programar
                  horarios.
                </ThemedText>
              )}

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
                onPress={() => resetDay(dayIndex)}
              />

              {debugText ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.debugText}>
                  [sel] {debugText}
                </ThemedText>
              ) : null}
            </ScrollView>

            {draft && (
              <View style={styles.overlay}>
                <View style={styles.center}>
                  <ThemedView
                    type="backgroundElement"
                    style={[styles.card, { borderColor: theme.border }]}
                  >
                    <ThemedText type="heading" style={styles.title}>
                      {chooserTitle}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.title}>
                      {formatTime12(draft.fromHour, 0)} –{' '}
                      {formatTime12((draft.toHour + 1) % 24, 0)} · {draft.toHour - draft.fromHour + 1} h
                    </ThemedText>

                    <View style={styles.chooserOptions}>
                      <ChooserOption
                        icon="dumbbell"
                        label="Rutina"
                        onPress={() => setRoutinePickerVisible(true)}
                      />
                      <ChooserOption
                        icon="calendar-check"
                        label="Actividad"
                        onPress={() => setActivityPickerVisible(true)}
                      />
                      {draft.eventId && (
                        <ChooserOption
                          icon="trash-can-outline"
                          label="Eliminar evento"
                          danger
                          onPress={handleDeleteEvent}
                        />
                      )}
                    </View>

                    <Button
                      label="Cancelar"
                      variant="ghost"
                      size="md"
                      onPress={closeChooser}
                      style={styles.cancelButton}
                    />
                  </ThemedView>
                </View>
              </View>
            )}

            {routinePickerVisible && (
              <RoutinePicker
                selectedId={
                  draft?.eventId
                    ? (day.events.find((event) => event.id === draft.eventId)?.routineId ?? null)
                    : null
                }
                onSelect={(routineId) => handleAddEvent({ routineId, activity: '' })}
                onCancel={() => setRoutinePickerVisible(false)}
              />
            )}
            {activityPickerVisible && (
              <ActivityPicker
                selected={
                  draft?.eventId
                    ? (day.events.find((event) => event.id === draft.eventId)?.activity ?? '')
                    : ''
                }
                onSelect={(activity) => handleAddEvent({ routineId: null, activity })}
                onCancel={() => setActivityPickerVisible(false)}
              />
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

type EventBlockProps = {
  event: DayEvent;
  onPress: () => void;
};

function EventBlock({ event, onPress }: EventBlockProps) {
  const theme = useTheme();
  const { routines } = useWorkout();

  const routine = event.routineId
    ? routines.find((item) => item.id === event.routineId)
    : null;
  const label = routine ? routine.name : event.activity;
  const isRoutine = routine != null;
  const barColor = isRoutine ? theme.accent : theme.success;

  const top = event.startTime.hour * ROW_HEIGHT + Spacing.one;
  const height = eventSpanHours(event) * ROW_HEIGHT - Spacing.one * 2;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.eventBlock,
        {
          top,
          height,
          backgroundColor: isRoutine ? theme.accentSoft : theme.successSoft,
          borderLeftColor: barColor,
        },
        pressed && styles.pressed,
      ]}
    >
      <MaterialCommunityIcons
        name={isRoutine ? 'dumbbell' : 'calendar-check'}
        size={16}
        color={barColor}
      />
      <View style={styles.eventBody}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {label || 'Evento sin nombre'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.eventTime}>
          {formatTime12(event.startTime.hour, event.startTime.minute)} –{' '}
          {formatTime12(event.endTime.hour, event.endTime.minute)}
        </ThemedText>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={16} color={theme.textSecondary} />
    </Pressable>
  );
}

type ChooserOptionProps = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  danger?: boolean;
  onPress: () => void;
};

function ChooserOption({ icon, label, danger, onPress }: ChooserOptionProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.chooserOption,
        { borderColor: danger ? '#F04438' : theme.border },
        pressed && styles.pressed,
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={22}
        color={danger ? '#F04438' : theme.accent}
      />
      <ThemedText type="smallBold" style={danger ? { color: '#F04438' } : undefined}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  center: {
    width: '100%',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  cancelButton: {
    alignSelf: 'stretch',
  },
  chooserOptions: {
    gap: Spacing.two,
  },
  chooserOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
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
  schedule: {
    gap: Spacing.two,
  },
  scheduleLabel: {
    marginTop: Spacing.one,
  },
  grid: {
    height: GRID_HEIGHT,
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  gridBody: {
    flex: 1,
    position: 'relative',
  },
  hourRow: {
    flexDirection: 'row',
    height: ROW_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  labelCol: {
    width: LABEL_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: Spacing.two,
  },
  hourLabel: {
    fontVariant: ['tabular-nums'],
    fontSize: 11,
  },
  dayCol: {
    flex: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  eventBlock: {
    position: 'absolute',
    left: LABEL_WIDTH + Spacing.one,
    right: Spacing.one,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderLeftWidth: 3,
    borderRadius: Radius.md,
  },
  eventBody: {
    flex: 1,
  },
  eventTime: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  selectionBand: {
    position: 'absolute',
    left: LABEL_WIDTH,
    right: 0,
    borderLeftWidth: 3,
  },
  nowLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  nowDot: {
    position: 'absolute',
    left: LABEL_WIDTH - 3,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  nowLine: {
    position: 'absolute',
    left: LABEL_WIDTH,
    right: 0,
    height: 2,
  },
  restHint: {
    textAlign: 'center',
    paddingVertical: Spacing.two,
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
  debugText: {
    alignSelf: 'center',
    marginTop: Spacing.two,
    fontFamily: 'monospace',
  },
  pressed: {
    opacity: 0.6,
  },
});
