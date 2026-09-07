import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  LinearTransition,
  measure,
  runOnJS,
  scrollTo,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type AnimatedRef,
  type SharedValue,
} from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';
import type { Exercise } from '@/types/workout';

const GAP = Spacing.three;
const LONG_PRESS_MS = 250;
const AUTO_SCROLL_EDGE = 72;
const AUTO_SCROLL_SPEED = 16;
/** How far the finger must travel before the held card detaches from its slot
 *  and starts following the finger. While resting or micro-moving, the card
 *  only shows the accent border focus (no lifting, no flicker). Small enough to
 *  feel immediate as soon as the user starts to drag. */
const LIFT_THRESHOLD = 6;
/** Pixels a slot center must be closer before the gap switches. Prevents
 *  flapping the gap back and forth while the finger sits on a boundary. */
const GAP_HYSTERESIS = 8;
/** How long the non-dragged cards take to glide into their new slots while the
 *  dragged card passes over them. */
const LAYOUT_DURATION_MS = 160;
/** Duration of the tiny easing that snaps the floating (overlay) card onto its
 *  final slot after release. The list already finished re-ordering, so this
 *  only covers the residual distance between the finger and the slot center. */
const SETTLE_MS = 150;

type SortableExerciseListProps = {
  exercises: Exercise[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onScrollEnabledChange: (enabled: boolean) => void;
  onDragStateChange: (index: number) => void;
  scrollRef: AnimatedRef<Animated.ScrollView>;
  scrollOffset: SharedValue<number>;
  scrollViewportHeight: SharedValue<number>;
  scrollWindowTop: SharedValue<number>;
  scrollContentHeight: SharedValue<number>;
  renderItem: (exercise: Exercise, isDragging: boolean) => ReactNode;
};

export function SortableExerciseList({
  exercises,
  onReorder,
  onScrollEnabledChange,
  onDragStateChange,
  scrollRef,
  scrollOffset,
  scrollViewportHeight,
  scrollWindowTop,
  scrollContentHeight,
  renderItem,
}: SortableExerciseListProps) {
  const heights = useSharedValue<Record<string, number>>({});
  const dragId = useSharedValue('');
  const pendingHold = useSharedValue('');
  const dragY = useSharedValue(0);
  const overlayBase = useSharedValue(0);
  const lastTranslationY = useSharedValue(0);
  const gapIndex = useSharedValue(-1);
  const releaseHandled = useSharedValue(0);
  /** The overlay is mounted (invisible) as soon as the long-press is recognized
   *  and is revealed on the UI thread at lift time, so lifting never waits on a
   *  JS render. */
  const overlayOpacity = useSharedValue(0);
  const [activeId, setActiveId] = useState<string | null>(null);

  const orderRef = useRef<string[]>(exercises.map((exercise) => exercise.id));
  const orderIds = useSharedValue<string[]>(orderRef.current.slice());
  const rank = useSharedValue<Record<string, number>>(
    buildRank(orderRef.current),
  );
  const originalIndexRef = useRef(-1);
  const dragIndexRef = useRef(-1);
  const settleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const ids = exercises.map((exercise) => exercise.id);
    orderRef.current = ids;
    orderIds.value = ids.slice();
    rank.value = buildRank(ids);
  }, [exercises, orderIds, rank]);

  const clearSettleTimeout = () => {
    if (settleTimeout.current) {
      clearTimeout(settleTimeout.current);
      settleTimeout.current = null;
    }
  };

  const topOfJS = (index: number): number => {
    let top = 0;
    const heightsValue = heights.value;
    const order = orderRef.current;
    for (let i = 0; i < index; i++) {
      top += (heightsValue[order[i]] ?? 0) + GAP;
    }
    return top;
  };

  const handleHeightMeasured = (id: string, height: number) => {
    heights.value = { ...heights.value, [id]: height };
  };

  const resetDragState = () => {
    clearSettleTimeout();
    dragId.value = '';
    pendingHold.value = '';
    dragY.value = 0;
    overlayBase.value = 0;
    lastTranslationY.value = 0;
    gapIndex.value = -1;
    releaseHandled.value = 0;
    overlayOpacity.value = 0;
    dragIndexRef.current = -1;
    setActiveId(null);
    onDragStateChange(-1);
    onScrollEnabledChange(true);
  };

  const settleDrag = () => {
    clearSettleTimeout();
    settleTimeout.current = setTimeout(resetDragState, SETTLE_MS);
  };

  /** Re-orders the list while the drag is in progress so that, on release, the
   *  list is already in its final order and nothing has to animate. */
  const commitMove = (from: number, to: number) => {
    const moved = orderRef.current.splice(from, 1)[0];
    orderRef.current.splice(to, 0, moved);
    orderIds.value = orderRef.current.slice();
    rank.value = buildRank(orderRef.current);
    dragIndexRef.current = to;
    onReorder(from, to);
  };

  const onMoveRequest = (to: number) => {
    if (dragId.value === '') return;
    const from = dragIndexRef.current;
    if (from === to || from < 0 || to < 0) return;
    commitMove(from, to);
  };

  const releaseDrag = (id: string) => {
    if (dragId.value !== id) return;
    // The list already reached its final order. Ease the floating card onto the
    // hidden slot that is already waiting in place (topOf(rank) in content
    // coordinates), then let the hidden card take over seamlessly.
    const finalRank = orderRef.current.indexOf(id);
    const finalTop = finalRank >= 0 ? topOfJS(finalRank) : overlayBase.value;
    dragY.value = withTiming(finalTop - overlayBase.value, {
      duration: SETTLE_MS,
      easing: Easing.out(Easing.quad),
    });
    settleDrag();
  };

  const cancelDrag = (id: string) => {
    if (dragId.value !== id) return;
    const from = dragIndexRef.current;
    const originalIndex = originalIndexRef.current;
    if (from !== originalIndex && from >= 0 && originalIndex >= 0) {
      commitMove(from, originalIndex);
    }
    // Glide the floating card back to the slot it was lifted from.
    dragY.value = withTiming(0, {
      duration: SETTLE_MS,
      easing: Easing.out(Easing.quad),
    });
    settleDrag();
  };

  /** Long-press recognized: only give the card its accent focus and pre-mount
   *  the (invisible) overlay on top of its slot. Nothing is lifted or re-ordered
   *  until the finger actually moves past the threshold. */
  const handleHoldBegin = (id: string, index: number) => {
    clearSettleTimeout();
    originalIndexRef.current = index;
    dragIndexRef.current = index;
    setActiveId(id);
    onDragStateChange(index);
    onScrollEnabledChange(false);
  };

  const handleHoldEnd = (id: string) => {
    if (activeId === id) {
      resetDragState();
    }
  };

  const overlayStyle = useAnimatedStyle(() => ({
    top: overlayBase.value + dragY.value,
    opacity: overlayOpacity.value,
    zIndex: 20,
    // Elevation is toggled on only while lifted so the invisible hold overlay
    // does not cast a shadow over the real card.
    elevation: overlayOpacity.value > 0 ? 20 : 0,
  }));

  const draggedExercise =
    activeId != null
      ? exercises.find((exercise) => exercise.id === activeId)
      : undefined;

  return (
    <View style={styles.wrapper}>
      {exercises.map((exercise) => (
        <SortableItem
          key={exercise.id}
          id={exercise.id}
          heights={heights}
          orderIds={orderIds}
          rank={rank}
          dragId={dragId}
          pendingHold={pendingHold}
          dragY={dragY}
          overlayBase={overlayBase}
          overlayOpacity={overlayOpacity}
          lastTranslationY={lastTranslationY}
          gapIndex={gapIndex}
          releaseHandled={releaseHandled}
          scrollRef={scrollRef}
          scrollOffset={scrollOffset}
          scrollViewportHeight={scrollViewportHeight}
          scrollWindowTop={scrollWindowTop}
          scrollContentHeight={scrollContentHeight}
          isDragged={activeId === exercise.id}
          onHoldBegin={handleHoldBegin}
          onHoldEnd={handleHoldEnd}
          onMoveRequest={onMoveRequest}
          onRelease={releaseDrag}
          onCancel={cancelDrag}
          onScrollEnabledChange={onScrollEnabledChange}
          onHeightMeasured={handleHeightMeasured}
        >
          {renderItem(exercise, activeId === exercise.id)}
        </SortableItem>
      ))}

      {draggedExercise != null && (
        <Animated.View
          pointerEvents="none"
          style={[styles.overlay, overlayStyle]}
        >
          {renderItem(draggedExercise, true)}
        </Animated.View>
      )}
    </View>
  );
}

type SortableItemProps = {
  id: string;
  heights: SharedValue<Record<string, number>>;
  orderIds: SharedValue<string[]>;
  rank: SharedValue<Record<string, number>>;
  dragId: SharedValue<string>;
  pendingHold: SharedValue<string>;
  dragY: SharedValue<number>;
  overlayBase: SharedValue<number>;
  overlayOpacity: SharedValue<number>;
  lastTranslationY: SharedValue<number>;
  gapIndex: SharedValue<number>;
  releaseHandled: SharedValue<number>;
  scrollRef: AnimatedRef<Animated.ScrollView>;
  scrollOffset: SharedValue<number>;
  scrollViewportHeight: SharedValue<number>;
  scrollWindowTop: SharedValue<number>;
  scrollContentHeight: SharedValue<number>;
  isDragged: boolean;
  onHoldBegin: (id: string, index: number) => void;
  onHoldEnd: (id: string) => void;
  onMoveRequest: (to: number) => void;
  onRelease: (id: string) => void;
  onCancel: (id: string) => void;
  onScrollEnabledChange: (enabled: boolean) => void;
  onHeightMeasured: (id: string, height: number) => void;
  children: ReactNode;
};

function SortableItem({
  id,
  heights,
  orderIds,
  rank,
  dragId,
  pendingHold,
  dragY,
  overlayBase,
  overlayOpacity,
  lastTranslationY,
  gapIndex,
  releaseHandled,
  scrollRef,
  scrollOffset,
  scrollViewportHeight,
  scrollWindowTop,
  scrollContentHeight,
  isDragged,
  onHoldBegin,
  onHoldEnd,
  onMoveRequest,
  onRelease,
  onCancel,
  onScrollEnabledChange,
  onHeightMeasured,
  children,
}: SortableItemProps) {
  const gesture = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_MS)
    .onStart(() => {
      const from = rank.value[id] ?? -1;
      if (from < 0) return;
      pendingHold.value = id;
      releaseHandled.value = 0;
      const metrics = measure(scrollRef);
      if (metrics) {
        scrollWindowTop.value = metrics.pageY;
        if (metrics.height > 0) scrollViewportHeight.value = metrics.height;
      }
      // Anchor the (invisible) overlay onto this card's slot right away.
      overlayBase.value = topOfWorklet(heights, orderIds, from);
      dragY.value = 0;
      gapIndex.value = from;
      overlayOpacity.value = 0;
      runOnJS(onHoldBegin)(id, from);
      runOnJS(onScrollEnabledChange)(false);
    })
    .onUpdate((event) => {
      if (dragId.value === id) {
        runLiftedUpdate({
          event,
          heights,
          orderIds,
          rank,
          dragY,
          overlayBase,
          lastTranslationY,
          gapIndex,
          scrollRef,
          scrollOffset,
          scrollViewportHeight,
          scrollWindowTop,
          scrollContentHeight,
          id,
          onMoveRequest,
        });
        return;
      }

      // Hold phase: the finger may rest or micro-move; keep the real card in
      // place showing just the accent border focus.
      if (Math.abs(event.translationY) < LIFT_THRESHOLD) return;
      const from = rank.value[id] ?? -1;
      if (from < 0) return;

      // Lift entirely on the UI thread: hide the real card, reveal the overlay
      // that was already mounted (invisible) over this slot, and snap it onto
      // the finger immediately — no JS round-trip, no delay.
      dragId.value = id;
      overlayOpacity.value = 1;
      lastTranslationY.value = event.translationY;
      dragY.value = event.translationY;
      gapIndex.value = from;
    })
    .onEnd((_, success) => {
      if (dragId.value === id) {
        releaseHandled.value = 1;
        if (!success) {
          runOnJS(onCancel)(id);
          return;
        }
        runOnJS(onRelease)(id);
        return;
      }
      if (pendingHold.value === id) {
        runOnJS(onHoldEnd)(id);
      }
    })
    .onFinalize(() => {
      if (dragId.value === id && releaseHandled.value === 0) {
        runOnJS(onCancel)(id);
      } else if (pendingHold.value === id && dragId.value !== id) {
        runOnJS(onHoldEnd)(id);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    if (dragId.value === id) {
      // The real card stays in the flow (as an invisible slot that keeps the
      // list gap correct and the gesture alive); the lifted copy is rendered
      // separately as an overlay that follows the finger.
      return { opacity: 0, zIndex: 0 };
    }
    return { opacity: 1, zIndex: 0 };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        layout={isDragged ? undefined : LinearTransition.duration(LAYOUT_DURATION_MS)}
        onLayout={(event) =>
          onHeightMeasured(id, event.nativeEvent.layout.height)
        }
        style={[styles.item, animatedStyle]}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

function runLiftedUpdate(params: {
  event: {
    translationY: number;
    velocityY: number;
    absoluteY: number;
  };
  id: string;
  heights: SharedValue<Record<string, number>>;
  orderIds: SharedValue<string[]>;
  rank: SharedValue<Record<string, number>>;
  dragY: SharedValue<number>;
  overlayBase: SharedValue<number>;
  lastTranslationY: SharedValue<number>;
  gapIndex: SharedValue<number>;
  scrollRef: AnimatedRef<Animated.ScrollView>;
  scrollOffset: SharedValue<number>;
  scrollViewportHeight: SharedValue<number>;
  scrollWindowTop: SharedValue<number>;
  scrollContentHeight: SharedValue<number>;
  onMoveRequest: (to: number) => void;
}) {
  'worklet';
  const {
    event,
    id,
    heights,
    orderIds,
    rank,
    dragY,
    overlayBase,
    lastTranslationY,
    gapIndex,
    scrollRef,
    scrollOffset,
    scrollViewportHeight,
    scrollWindowTop,
    scrollContentHeight,
    onMoveRequest,
  } = params;

  const from = rank.value[id] ?? -1;
  if (from < 0) return;

  // Apply finger movement incrementally so auto-scroll compensations are
  // never lost between frames.
  const delta = event.translationY - lastTranslationY.value;
  lastTranslationY.value = event.translationY;
  dragY.value = dragY.value + delta;

  // The floating card's center in content coordinates.
  const dragHeight = heights.value[id] ?? 0;
  const mid = overlayBase.value + dragY.value + (dragHeight + GAP) / 2;

  const n = orderIds.value.length;
  if (n > 0) {
    const current = gapIndex.value;
    let best = current >= 0 && current < n ? current : from;
    let bestDistance = Infinity;
    let cum = 0;
    for (let i = 0; i < n; i++) {
      const step = (heights.value[orderIds.value[i]] ?? 0) + GAP;
      const center = cum + step / 2;
      let distance = Math.abs(mid - center);
      if (i === best) distance -= GAP_HYSTERESIS;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
      cum += step;
    }
    gapIndex.value = best;
    if (best !== from) {
      runOnJS(onMoveRequest)(best);
    }
  }

  const maxScroll = Math.max(
    0,
    scrollContentHeight.value - scrollViewportHeight.value,
  );
  const topLimit = scrollWindowTop.value + AUTO_SCROLL_EDGE;
  const bottomLimit =
    scrollWindowTop.value + scrollViewportHeight.value - AUTO_SCROLL_EDGE;
  if (event.velocityY < 0 && event.absoluteY < topLimit && scrollOffset.value > 0) {
    const depth = Math.min(1, (topLimit - event.absoluteY) / AUTO_SCROLL_EDGE);
    const next = Math.max(0, scrollOffset.value - AUTO_SCROLL_SPEED * depth);
    const deltaScroll = next - scrollOffset.value;
    scrollTo(scrollRef, 0, next, false);
    scrollOffset.value = next;
    dragY.value = dragY.value + deltaScroll;
  } else if (
    event.velocityY > 0 &&
    event.absoluteY > bottomLimit &&
    scrollOffset.value < maxScroll
  ) {
    const depth = Math.min(
      1,
      (event.absoluteY - bottomLimit) / AUTO_SCROLL_EDGE,
    );
    const next = Math.min(
      maxScroll,
      scrollOffset.value + AUTO_SCROLL_SPEED * depth,
    );
    const deltaScroll = next - scrollOffset.value;
    scrollTo(scrollRef, 0, next, false);
    scrollOffset.value = next;
    dragY.value = dragY.value + deltaScroll;
  }
}

function buildRank(ids: string[]): Record<string, number> {
  const rank: Record<string, number> = {};
  for (let i = 0; i < ids.length; i++) rank[ids[i]] = i;
  return rank;
}

/** Cumulative top offset of an index in the list (worklet-safe). */
function topOfWorklet(
  heights: SharedValue<Record<string, number>>,
  orderIds: SharedValue<string[]>,
  index: number,
): number {
  'worklet';
  let top = 0;
  for (let i = 0; i < index; i++) {
    top += (heights.value[orderIds.value[i]] ?? 0) + GAP;
  }
  return top;
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    gap: GAP,
  },
  item: {
    // The wrapper is measured by onLayout; no padding here so heights match
    // the card and the parent's gap (Spacing.three) is the stride offset.
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});