import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RestPhase } from '@/hooks/use-rest-timer';
import { formatRest, formatTime } from '@/utils/format';

export type RestTimerProps = {
  phase: RestPhase;
  remainingSeconds: number;
  durationSeconds: number;
  onAdjustSeconds?: (deltaSeconds: number) => void;
};

export function RestTimer({
  phase,
  remainingSeconds,
  durationSeconds,
  onAdjustSeconds,
}: RestTimerProps) {
  const theme = useTheme();

  if (phase === 'idle') {
    return (
      <View style={styles.restRow}>
        <ThemedText type="small" themeColor="textSecondary">
          Descanso entre series
        </ThemedText>
        <View style={[styles.chip, { backgroundColor: theme.accentSoft }]}>
          <ThemedText type="smallBold" style={{ color: theme.accent }}>
            {formatRest(durationSeconds)}
          </ThemedText>
        </View>
      </View>
    );
  }

  const finished = phase === 'finished';
  const accent = theme.onAccent;

  const progress = Math.max(0, Math.min(1, remainingSeconds / durationSeconds));

  return (
    <View style={styles.content}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Restar 30 segundos"
        onPress={() => onAdjustSeconds?.(-30)}
        hitSlop={8}
        style={({ pressed }) => [
          styles.adjustButton,
          styles.adjustLeft,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.adjustPressed,
        ]}
      >
        <MaterialCommunityIcons name="minus" size={18} color={theme.accent} />
        <ThemedText type="smallBold" style={[styles.adjustLabel, { color: theme.accent }]}>
          30
        </ThemedText>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sumar 30 segundos"
        onPress={() => onAdjustSeconds?.(30)}
        hitSlop={8}
        style={({ pressed }) => [
          styles.adjustButton,
          styles.adjustRight,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.adjustPressed,
        ]}
      >
        <MaterialCommunityIcons name="plus" size={18} color={theme.accent} />
        <ThemedText type="smallBold" style={[styles.adjustLabel, { color: theme.accent }]}>
          30
        </ThemedText>
      </Pressable>

      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: accent }]} />
        <ThemedText type="caps" style={{ color: accent }}>
          {finished ? 'Descanso terminado' : 'Descanso'}
        </ThemedText>
      </View>

      <ThemedText style={[styles.time, { color: accent }]}>
        {formatTime(remainingSeconds)}
      </ThemedText>

      {!finished && (
        <View style={[styles.track, { backgroundColor: 'rgba(0,0,0,0.22)' }]}>
          <View style={[styles.fill, { backgroundColor: accent, width: `${progress * 100}%` }]} />
        </View>
      )}

      <ThemedText type="small" style={[styles.hint, { color: accent }]}>
        {finished ? 'Listo para la siguiente serie' : 'Pulsa «Saltar descanso» para continuar'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignSelf: 'stretch',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
  },
  adjustButton: {
    position: 'absolute',
    top: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    minWidth: 64,
  },
  adjustLeft: {
    left: Spacing.two,
  },
  adjustRight: {
    right: Spacing.two,
  },
  adjustPressed: {
    opacity: 0.7,
  },
  adjustLabel: {
    fontSize: 16,
    lineHeight: 20,
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  time: {
    fontFamily: Fonts.mono,
    fontSize: 72,
    lineHeight: 80,
    fontWeight: 700,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 6,
    borderRadius: 3,
    width: 300,
    alignSelf: 'center',
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
  hint: {
    textAlign: 'center',
  },
});
