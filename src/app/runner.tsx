import { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import RunnerMap from '@/components/runner-map';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import {
  BottomTabInset,
  MaxContentWidth,
  Radius,
  Spacing,
  TopInset,
} from '@/constants/theme';
import { useRunner, type RunSnapshot } from '@/hooks/use-runner';
import { useTheme } from '@/hooks/use-theme';
import {
  deleteRun,
  loadRuns,
  saveRun,
  type RunSession,
} from '@/services/run-storage';
import { formatTime, localDateKey } from '@/utils/format';

export default function RunnerScreen() {
  const {
    status,
    elapsedMs,
    distanceM,
    route,
    currentLocation,
    refreshLocation,
    start,
    pause,
    resume,
    finish,
  } = useRunner();
  const theme = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ goal?: string | string[] }>();
  const rawGoal = Array.isArray(params.goal) ? params.goal[0] : params.goal;
  const goalKm = rawGoal != null ? Number(rawGoal) : NaN;
  const goalActive = Number.isFinite(goalKm) && goalKm > 0;
  const [view, setView] = useState<'run' | 'history'>(() =>
    goalActive ? 'run' : 'history',
  );
  const [runs, setRuns] = useState<RunSession[]>([]);
  const [summary, setSummary] = useState<RunSnapshot | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (goalActive && view !== 'run') setView('run');
  }, [goalActive, view]);

  const hasGoal = goalActive;
  const goalMeters = hasGoal ? goalKm * 1000 : 0;
  const goalReached = hasGoal && distanceM >= goalMeters;

  // Keep the screen awake while a session is active.
  useEffect(() => {
    if (status === 'idle') return;
    activateKeepAwakeAsync();
    return () => {
      deactivateKeepAwake();
    };
  }, [status]);

  useEffect(() => {
    loadRuns().then(setRuns);
  }, []);

  useEffect(() => {
    if (view !== 'run') return;
    let active = true;
    const ensureLocation = async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted) {
          const next = await Location.requestForegroundPermissionsAsync();
          if (active && next.status !== 'granted') {
            setPermissionDenied(true);
            return;
          }
        }
        if (active) refreshLocation();
      } catch {
        if (active) setPermissionDenied(true);
      }
    };
    ensureLocation();
    return () => {
      active = false;
    };
  }, [view, refreshLocation]);

  const requestPermission = useCallback(async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    setPermissionDenied(permission.status !== 'granted');
    if (permission.status === 'granted') refreshLocation();
  }, [refreshLocation]);

  const openSettings = useCallback(() => {
    if (Platform.OS === 'web') {
      requestPermission();
      return;
    }
    Linking.openSettings();
  }, [requestPermission]);

  const handlePrimary = () => {
    if (status === 'idle') {
      start();
    } else if (status === 'running') {
      pause();
    } else {
      resume();
    }
  };

  const handleFinish = () => {
    setSummary(finish());
  };

  const handleSaveSummary = async () => {
    if (!summary) return;
    const endedAt = new Date();
    const session: RunSession = {
      id: String(endedAt.getTime()),
      startedAt: new Date(endedAt.getTime() - summary.elapsedMs).toISOString(),
      endedAt: endedAt.toISOString(),
      durationMs: summary.elapsedMs,
      distanceM: summary.distanceM,
      route: summary.route,
    };
    await saveRun(session);
    const loaded = await loadRuns();
    setRuns(loaded);
    setSummary(null);
    if (hasGoal) router.setParams({ goal: '' });
  };

  const handleDeleteRun = async (id: string) => {
    await deleteRun(id);
    const loaded = await loadRuns();
    setRuns(loaded);
  };

  const topInset = safeAreaInsets.top + (Platform.OS === 'web' ? TopInset : 0);
  const bottomInset =
    safeAreaInsets.bottom + BottomTabInset + Spacing.four;

  const primaryLabel =
    status === 'idle' ? 'INICIAR' : status === 'running' ? 'PAUSAR' : 'REANUDAR';

  return (
    <View style={styles.screen}>
      {view === 'run' ? (
        <>
          <RunnerMap
            route={route}
            currentLocation={currentLocation}
            paused={status === 'paused'}
          />

          {!currentLocation && status === 'idle' && (
            <View style={styles.mapFallback}>
              <MaterialCommunityIcons
                name="map-marker-radius-outline"
                size={32}
                color={theme.textSecondary}
              />
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.centerText}
              >
                Obteniendo tu ubicación…
              </ThemedText>
            </View>
          )}

          <View
            pointerEvents="box-none"
            style={[styles.topOverlay, { paddingTop: topInset }]}
          >
            <View style={[styles.modeRow, { maxWidth: MaxContentWidth }]}>
              <View style={styles.modePills}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setView('run')}
                  style={[styles.modePill, { backgroundColor: theme.accent }]}
                >
                  <ThemedText type="smallBold" themeColor="onAccent">
                    Correr
                  </ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setView('history')}
                  style={styles.modePill}
                >
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    Historial
                  </ThemedText>
                </Pressable>
              </View>
            </View>

            {hasGoal && (
              <View
                style={[
                  styles.goalChip,
                  { borderColor: goalReached ? theme.success : theme.accent },
                ]}
              >
                <MaterialCommunityIcons
                  name={goalReached ? 'flag-checkered' : 'target'}
                  size={16}
                  color={goalReached ? theme.success : theme.accent}
                />
                <ThemedText
                  type="smallBold"
                  style={{ color: goalReached ? theme.success : theme.accent }}
                >
                  {goalReached
                    ? '¡Meta conseguida!'
                    : `Meta · ${goalKm.toFixed(2)} km`}
                </ThemedText>
              </View>
            )}

            <View style={styles.statsPanel}>
              <StatBox
                label="KM"
                value={
                  hasGoal
                    ? `${formatDistance(distanceM)}/${goalKm.toFixed(2)}`
                    : formatDistance(distanceM)
                }
              />
              <StatBox
                label="TIEMPO"
                value={formatTime(Math.floor(elapsedMs / 1000))}
              />
              <StatBox label="RITMO" value={formatPace(elapsedMs, distanceM)} />
            </View>

            {permissionDenied && (
              <ThemedView
                type="backgroundElement"
                style={[styles.permissionBanner, { borderColor: theme.border }]}
              >
                <ThemedText type="small" style={styles.permissionText}>
                  Necesito la ubicación para trazar tu ruta.
                </ThemedText>
                <View style={styles.permissionActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={requestPermission}
                    style={({ pressed }) => [
                      styles.permissionAction,
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText type="smallBold" style={{ color: theme.accent }}>
                      Permitir
                    </ThemedText>
                  </Pressable>
                  {Platform.OS !== 'web' && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={openSettings}
                      style={({ pressed }) => [
                        styles.permissionAction,
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedText type="smallBold" themeColor="textSecondary">
                        Ajustes
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
              </ThemedView>
            )}
          </View>

          <View
            pointerEvents="box-none"
            style={[styles.bottomOverlay, { paddingBottom: bottomInset }]}
          >
            <View style={[styles.controls, { maxWidth: MaxContentWidth }]}>
              <Button
                label={primaryLabel}
                variant={status === 'idle' ? 'primary' : 'outline'}
                onPress={handlePrimary}
                style={styles.controlGrow}
              />
              {status !== 'idle' && (
                <Button
                  label="DETENER"
                  variant="danger"
                  onPress={handleFinish}
                  style={[styles.controlGrow, styles.detenerButton]}
                />
              )}
            </View>
          </View>
        </>
      ) : (
        <HistoryView
          runs={runs}
          topInset={topInset}
          bottomInset={bottomInset}
          onDelete={handleDeleteRun}
          onStartRun={() => setView('run')}
        />
      )}

      <Modal
        visible={summary != null}
        transparent
        animationType="fade"
        onRequestClose={() => setSummary(null)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView
            type="backgroundElement"
            style={[styles.modalCard, { borderColor: theme.border }]}
          >
            <ThemedText type="heading" style={styles.modalTitle}>
              Carrera terminada
            </ThemedText>
            <View style={styles.modalStats}>
              <StatBox label="KM" value={formatDistance(summary?.distanceM ?? 0)} />
              <StatBox
                label="TIEMPO"
                value={formatTime(Math.floor((summary?.elapsedMs ?? 0) / 1000))}
              />
              <StatBox
                label="RITMO"
                value={formatPace(summary?.elapsedMs ?? 0, summary?.distanceM ?? 0)}
              />
            </View>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.centerText}
            >
              Tu ruta se guardará en el historial.
            </ThemedText>
            <View style={styles.modalActions}>
              <Button
                label="Descartar"
                variant="ghost"
                size="md"
                onPress={() => setSummary(null)}
                style={styles.modalButton}
              />
              <Button
                label="Guardar"
                variant="primary"
                size="md"
                onPress={handleSaveSummary}
                style={styles.modalButton}
              />
            </View>
          </ThemedView>
        </View>
      </Modal>
    </View>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <ThemedText type="smallBold" style={styles.statValue}>
        {value}
      </ThemedText>
      <ThemedText type="caps" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function HistoryView({
  runs,
  topInset,
  bottomInset,
  onDelete,
  onStartRun,
}: {
  runs: RunSession[];
  topInset: number;
  bottomInset: number;
  onDelete: (id: string) => void;
  onStartRun: () => void;
}) {
  const theme = useTheme();

  return (
    <ScrollView
      style={[styles.historyScroll, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.historyContent,
        { paddingTop: topInset + Spacing.four, paddingBottom: bottomInset + Spacing.four },
      ]}
    >
      <View style={[styles.historyInner, { maxWidth: MaxContentWidth }]}>
        {runs.length === 0 ? (
          <View style={styles.historyEmpty}>
            <ThemedText type="heading" style={styles.centerText}>
              Aún no tienes carreras
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.centerText}
            >
              Sale a correr y guarda tu primera sesión para verla aquí.
            </ThemedText>
            <Button label="Ir a correr" onPress={onStartRun} style={styles.emptyButton} />
          </View>
        ) : (
          <>
            <ThemedText type="caps" themeColor="textSecondary">
              Historial
            </ThemedText>
            {runs.map((run) => (
              <ThemedView
                key={run.id}
                type="backgroundElement"
                style={[styles.runCard, { borderColor: theme.border }]}
              >
                <View style={styles.runCardHeader}>
                  <ThemedText type="smallBold">
                    {formatRunDate(run.endedAt)}
                  </ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Eliminar carrera"
                    onPress={() => onDelete(run.id)}
                    hitSlop={8}
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={18}
                      color={theme.textSecondary}
                    />
                  </Pressable>
                </View>
                <View style={styles.runCardStats}>
                  <View style={styles.runCardStat}>
                    <ThemedText type="smallBold" style={{ color: theme.accent }}>
                      {formatDistance(run.distanceM)} km
                    </ThemedText>
                    <ThemedText type="caps" themeColor="textSecondary">
                      Distancia
                    </ThemedText>
                  </View>
                  <View style={styles.runCardStat}>
                    <ThemedText type="smallBold">
                      {formatTime(Math.floor(run.durationMs / 1000))}
                    </ThemedText>
                    <ThemedText type="caps" themeColor="textSecondary">
                      Tiempo
                    </ThemedText>
                  </View>
                  <View style={styles.runCardStat}>
                    <ThemedText type="smallBold">
                      {formatPace(run.durationMs, run.distanceM)}
                    </ThemedText>
                    <ThemedText type="caps" themeColor="textSecondary">
                      Ritmo
                    </ThemedText>
                  </View>
                </View>
              </ThemedView>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(2);
}

function formatPace(elapsedMs: number, distanceM: number): string {
  const km = distanceM / 1000;
  if (km < 0.01) return '--';
  const secondsPerKm = elapsedMs / 1000 / km;
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatRunDate(isoDate: string): string {
  const date = new Date(isoDate);
  return `${localDateKey(date)} · ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  mapFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  centerText: {
    textAlign: 'center',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  modeRow: {
    width: '100%',
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(22, 22, 28, 0.92)',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  modePills: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(22, 22, 28, 0.9)',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#4A4A52',
    padding: Spacing.half,
  },
  modePill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.full,
  },
  statsPanel: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    backgroundColor: 'rgba(22, 22, 28, 0.92)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#4A4A52',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
  },
  statValue: {
    fontSize: 17,
    fontVariant: ['tabular-nums'],
  },
  permissionBanner: {
    alignSelf: 'stretch',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.one,
  },
  permissionText: {
    flexShrink: 1,
  },
  permissionActions: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  permissionAction: {
    paddingVertical: Spacing.one,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
  },
  controls: {
    width: '100%',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  controlGrow: {
    flex: 1,
  },
  detenerButton: {
    marginLeft: 0,
    borderWidth: 1.5,
    borderColor: '#F04438',
  },
  historyScroll: {
    flex: 1,
  },
  historyContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
  },
  historyInner: {
    flex: 1,
    gap: Spacing.three,
  },
  historyEmpty: {
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#4A4A52',
    borderRadius: Radius.lg,
    padding: Spacing.five,
  },
  emptyButton: {
    marginTop: Spacing.two,
  },
  runCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  runCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  runCardStats: {
    flexDirection: 'row',
  },
  runCardStat: {
    flex: 1,
    gap: Spacing.half,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalTitle: {
    textAlign: 'center',
  },
  modalStats: {
    flexDirection: 'row',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  modalButton: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});