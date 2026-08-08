import { useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

type CalendarProps = {
  selectedDate?: Date | null;
  onSelectDate?: (date: Date) => void;
  /** Dates to highlight, formatted as YYYY-MM-DD. */
  markedDates?: string[];
  initialMonth?: Date;
};

export function Calendar({
  selectedDate,
  onSelectDate,
  markedDates = [],
  initialMonth,
}: CalendarProps) {
  const theme = useTheme();
  const today = new Date();
  const [month, setMonth] = useState(
    initialMonth ? new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const cells = getMonthCells(month.getFullYear(), month.getMonth());
  const rows = chunk(cells, 7);

  const changeMonth = (delta: number) => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  };

  const goToToday = () => {
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    onSelectDate?.(today);
  };

  const handleCellPress = (cell: { date: Date; inMonth: boolean }) => {
    if (!cell.inMonth) {
      setMonth(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
    }
    onSelectDate?.(cell.date);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <ThemedText type="smallBold" style={styles.monthTitle}>
          {MONTHS[month.getMonth()]} {month.getFullYear()}
        </ThemedText>
        <View style={styles.nav}>
          <NavButton label="‹" onPress={() => changeMonth(-1)} />
          <NavButton label="›" onPress={() => changeMonth(1)} />
        </View>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((weekday) => (
          <ThemedText key={weekday} type="caps" themeColor="textSecondary" style={styles.weekday}>
            {weekday}
          </ThemedText>
        ))}
      </View>

      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.weekRow}>
          {row.map((cell) => {
            const isSelected = selectedDate != null && isSameDay(cell.date, selectedDate);
            const isToday = isSameDay(cell.date, today);
            const isMarked = markedDates.includes(formatKey(cell.date));
            const dimmed = !cell.inMonth;

            const circleStyle: ViewStyle[] = [styles.dayCircle];
            let textColor: string = theme.text;
            if (isSelected) {
              circleStyle.push({ backgroundColor: theme.accent, borderColor: theme.accent, borderWidth: 1.5 });
              textColor = theme.onAccent;
            } else if (isToday) {
              circleStyle.push({ borderColor: theme.accent, borderWidth: 1.5 });
            }
            if (dimmed) {
              textColor = theme.textSecondary;
              circleStyle.push({ opacity: 0.35 });
            }

            return (
              <Pressable
                key={cell.date.getTime()}
                accessibilityRole="button"
                onPress={() => handleCellPress(cell)}
                style={styles.daySlot}>
                <View style={circleStyle}>
                  <ThemedText type="smallBold" style={[styles.dayNumber, { color: textColor }]}>
                    {cell.date.getDate()}
                  </ThemedText>
                  {isMarked && (
                    <View
                      style={[
                        styles.markDot,
                        { backgroundColor: isSelected ? theme.onAccent : theme.accent },
                      ]}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      <Pressable
        accessibilityRole="button"
        onPress={goToToday}
        style={({ pressed }) => [styles.todayButton, pressed && styles.pressed]}>
        <ThemedText type="smallBold" style={{ color: theme.accent }}>
          Hoy
        </ThemedText>
      </Pressable>
    </Card>
  );
}

function NavButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.navButton,
        { backgroundColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold" style={{ color: theme.accent, fontSize: 18, lineHeight: 20 }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function getMonthCells(year: number, month: number) {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const day = i - firstWeekday + 1;
    if (day < 1) {
      cells.push({ date: new Date(year, month - 1, prevDays + day), inMonth: false });
    } else if (day > daysInMonth) {
      cells.push({ date: new Date(year, month + 1, day - daysInMonth), inMonth: false });
    } else {
      cells.push({ date: new Date(year, month, day), inMonth: true });
    }
  }
  return cells;
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthTitle: {
    fontSize: 18,
  },
  nav: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
  },
  daySlot: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  dayNumber: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  markDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  todayButton: {
    alignSelf: 'flex-end',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  pressed: {
    opacity: 0.6,
  },
});
