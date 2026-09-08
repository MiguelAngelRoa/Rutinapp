import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
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
  type RunRoutePoint,
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
  const [view, setView] = useState<'run' | 'history'>('run');
  const [runs, setRuns] = useState<RunSession[]>([]);
  const [summary, setSummary] = useState<RunSnapshot | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showPlaces, setShowPlaces] = useState(true);

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

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const metricsRef = useRef({
    width: 0,
    height: 0,
    panelWidth: 0,
    panelHeight: 0,
  });
  const [panelVisible, setPanelVisible] = useState(false);
  const translate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const currentPosRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const xListener = translate.x.addListener(({ value }) => {
      currentPosRef.current.x = value;
    });
    const yListener = translate.y.addListener(({ value }) => {
      currentPosRef.current.y = value;
    });
    return () => {
      translate.x.removeListener(xListener);
      translate.y.removeListener(yListener);
    };
  }, [translate]);

  const clampPos = (x: number, y: number) => {
    const m = metricsRef.current;
    const maxX = Math.max(0, m.width - m.panelWidth);
    const maxY = Math.max(0, m.height - m.panelHeight);
    return {
      x: Math.min(Math.max(0, x), maxX),
      y: Math.min(Math.max(0, y), maxY),
    };
  };

  const refreshPanelMetrics = () => {
    const m = metricsRef.current;
    if (!m.width || !m.height || !m.panelWidth || !m.panelHeight) return;
    if (panelVisible) return;
    setPanelVisible(true);
    const initial = {
      x: Math.max(0, m.width - m.panelWidth - Spacing.four),
      y: Math.max(
        0,
        topInset + (m.height - topInset - bottomInset - m.panelHeight) / 2,
      ),
    };
    translate.setValue(initial);
  };

  const handleMapContainerLayout = (event: {
    nativeEvent: { layout: { width: number; height: number } };
  }) => {
    metricsRef.current.width = event.nativeEvent.layout.width;
    metricsRef.current.height = event.nativeEvent.layout.height;
    refreshPanelMetrics();
  };

  const handlePanelLayout = (event: {
    nativeEvent: { layout: { width: number; height: number } };
  }) => {
    metricsRef.current.panelWidth = event.nativeEvent.layout.width;
    metricsRef.current.panelHeight = event.nativeEvent.layout.height;
    refreshPanelMetrics();
  };

  // Keep the panel inside the window if it rotates or resizes.
  useEffect(() => {
    if (!panelVisible) return;
    metricsRef.current.width = windowWidth;
    metricsRef.current.height = windowHeight;
    const next = clampPos(currentPosRef.current.x, currentPosRef.current.y);
    translate.setValue(next);
  }, [windowWidth, windowHeight, panelVisible, translate]);

  const snapToEdge = (pos: { x: number; y: number }, vx = 0) => {
    const m = metricsRef.current;
    const leftX = Spacing.four;
    const rightX = Math.max(0, m.width - m.panelWidth - Spacing.four);
    const panelCenterX = pos.x + m.panelWidth / 2;
    const fling = Math.abs(vx) > 0.4;
    const targetX = fling
      ? vx > 0
        ? rightX
        : leftX
      : panelCenterX < m.width / 2
        ? leftX
        : rightX;
    const target = { x: targetX, y: clampPos(0, pos.y).y };
    currentPosRef.current = target;
    Animated.spring(translate, {
      toValue: target,
      useNativeDriver: false,
      friction: 7,
      tension: 60,
    }).start();
  };

  const panelPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
      onPanResponderGrant: () => {
        translate.stopAnimation();
        startPosRef.current = { ...currentPosRef.current };
      },
      onPanResponderMove: (_, gesture) => {
        translate.setValue(
          clampPos(
            startPosRef.current.x + gesture.dx,
            startPosRef.current.y + gesture.dy,
          ),
        );
      },
      onPanResponderRelease: (_, gesture) => {
        snapToEdge(
          clampPos(
            startPosRef.current.x + gesture.dx,
            startPosRef.current.y + gesture.dy,
          ),
          gesture.vx,
        );
      },
      onPanResponderTerminate: (_, gesture) => {
        snapToEdge(
          clampPos(
            startPosRef.current.x + gesture.dx,
            startPosRef.current.y + gesture.dy,
          ),
          gesture.vx,
        );
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  return (
    <View style={styles.screen}>
      {view === 'run' ? (
        <>
          <RunnerMap
            route={route}
            currentLocation={currentLocation}
            paused={status === 'paused'}
            showPois={showPlaces}
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
            style={styles.mapPanelContainer}
            onLayout={handleMapContainerLayout}
          >
            <Animated.View
              {...panelPanResponder.panHandlers}
              onLayout={handlePanelLayout}
              pointerEvents={panelVisible ? 'auto' : 'none'}
              style={[
                styles.mapControlPanel,
                { opacity: panelVisible ? 1 : 0 },
                {
                  transform: [
                    { translateX: translate.x },
                    { translateY: translate.y },
                  ],
                },
              ]}
            >
              <View style={styles.panelDragHandle}>
                <MaterialCommunityIcons
                  name="drag"
                  size={20}
                  color={theme.textSecondary}
                  accessibilityLabel="Arrastrar panel"
                />
              </View>
              <PanelIconButton
                label={showPlaces ? 'Ocultar lugares' : 'Mostrar lugares'}
                color={showPlaces ? theme.accent : theme.textSecondary}
                icon={showPlaces ? 'map-marker-radius-outline' : 'map-marker-off-outline'}
                onPress={() => setShowPlaces((current) => !current)}
              />
              <View style={styles.panelDivider} />
              <PanelIconButton
                label={
                  status === 'idle'
                    ? 'Iniciar'
                    : status === 'running'
                      ? 'Pausar'
                      : 'Reanudar'
                }
                color={
                  status === 'running' ? theme.success : theme.accent
                }
                icon={status === 'running' ? 'pause' : 'play'}
                onPress={() => {
                  if (status === 'running') pause();
                  else if (status === 'idle') start();
                  else resume();
                }}
              />
              <View style={styles.panelDivider} />
              <PanelIconButton
                label="Detener"
                active={status !== 'idle'}
                color={status !== 'idle' ? '#F04438' : theme.textSecondary}
                icon="stop"
                onPress={handleFinish}
              />
            </Animated.View>
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

function PanelIconButton({
  label,
  icon,
  color,
  active = true,
  onPress,
}: {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !active }}
      disabled={!active}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.panelButton,
        pressed && styles.pressed,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={24} color={color} />
    </Pressable>
  );
}

const THUMB_STROKE_PCT = 2.2;

function RunRouteThumb({ route }: { route: RunRoutePoint[] }) {
  const theme = useTheme();

  if (route.length < 2) {
    return (
      <View style={[styles.thumbEmpty, { borderColor: theme.border }]}>
        <MaterialCommunityIcons
          name="image-off-outline"
          size={20}
          color={theme.textSecondary}
        />
        <ThemedText type="small" themeColor="textSecondary">
          No hay imagen de la carrera.
        </ThemedText>
      </View>
    );
  }

  const minLon = Math.min(...route.map((p) => p.longitude));
  const maxLon = Math.max(...route.map((p) => p.longitude));
  const minLat = Math.min(...route.map((p) => p.latitude));
  const maxLat = Math.max(...route.map((p) => p.latitude));
  const lonRange = maxLon - minLon || 1e-6;
  const latRange = maxLat - minLat || 1e-6;

  const norm = route.map((point) => {
    const x = 5 + ((point.longitude - minLon) / lonRange) * 90;
    const yBase = 5 + ((point.latitude - minLat) / latRange) * 90;
    return { x, y: 100 - yBase };
  });

  const start = norm[0];
  const end = norm[norm.length - 1];

  return (
    <View
      style={[
        styles.thumbBox,
        {
          borderColor: theme.border,
          backgroundColor: theme.backgroundSelected,
        },
      ]}
    >
      {norm.slice(0, -1).map((point, i) => {
        const next = norm[i + 1];
        const dx = next.x - point.x;
        const dy = next.y - point.y;
        const length = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        return (
          <View
            key={i}
            style={[
              styles.thumbSegment,
              {
                left: `${(point.x + next.x) / 2 - length / 2}%`,
                top: `${(point.y + next.y) / 2 - THUMB_STROKE_PCT / 2}%`,
                width: `${length}%`,
                height: `${THUMB_STROKE_PCT}%`,
                backgroundColor: theme.accent,
                transform: [{ rotate: `${angle}rad` }],
              },
            ]}
          />
        );
      })}
      <View
        style={[
          styles.thumbDot,
          {
            left: `${start.x}%`,
            top: `${start.y}%`,
            backgroundColor: theme.success,
          },
        ]}
      />
      <View
        style={[
          styles.thumbDot,
          {
            left: `${end.x}%`,
            top: `${end.y}%`,
            backgroundColor: theme.accent,
            borderColor: theme.background,
          },
        ]}
      />
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
                <RunRouteThumb route={run.route} />
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
  mapPanelContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  mapControlPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: 'rgba(22, 22, 28, 0.92)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#4A4A52',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    alignItems: 'center',
  },
  panelDragHandle: {
    width: 44,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  panelButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  panelDivider: {
    width: 28,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#4A4A52',
    marginVertical: Spacing.one,
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
  thumbBox: {
    width: '100%',
    height: 120,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbSegment: {
    position: 'absolute',
    borderRadius: Radius.sm,
  },
  thumbDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    marginLeft: -4,
    marginTop: -4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  thumbEmpty: {
    height: 120,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
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