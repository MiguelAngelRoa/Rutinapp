import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MAX_VISUAL_DISTANCE = 4;

type WheelPickerProps = {
  items: readonly string[];
  /** Only applied on the first mount. */
  initialIndex?: number;
  onChange?: (index: number) => void;
  itemHeight?: number;
  visibleCount?: number;
  highlightColor?: string;
};

type RowProps = {
  label: string;
  distance: number;
  itemHeight: number;
};

const Row = memo(function Row({ label, distance, itemHeight }: RowProps) {
  const theme = useTheme();
  const isActive = distance === 0;
  const scale = Math.max(0.9, 1 - distance * 0.05);

  return (
    <View style={[styles.itemSlot, { height: itemHeight }]}>
      <ThemedText
        style={[
          styles.item,
          {
            color: isActive ? theme.accent : theme.textSecondary,
            opacity: Math.max(0.4, 1 - distance * 0.2),
            fontWeight: isActive ? '700' : '500',
            transform: [{ scale }],
          },
        ]}>
        {label}
      </ThemedText>
    </View>
  );
});

export function WheelPicker({
  items,
  initialIndex = 0,
  onChange,
  itemHeight = 44,
  visibleCount = 5,
  highlightColor,
}: WheelPickerProps) {
  const theme = useTheme();
  const listRef = useRef<FlatList<string>>(null);
  const didInitRef = useRef(false);
  const lastRawRef = useRef(0);
  const lastOffsetRef = useRef(0);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  const cycle = items.length;
  const wheelHeight = itemHeight * visibleCount;
  const halfSlots = Math.floor((visibleCount - 1) / 2);
  const pad = halfSlots;
  const initRaw = cycle > 0 ? pad + Math.max(0, Math.min(cycle - 1, initialIndex)) : 0;

  const data = useMemo(() => {
    if (cycle === 0) return [];
    const blanks = new Array(pad).fill('');
    return [...blanks, ...items, ...blanks];
  }, [items, cycle, pad]);

  const maxOffset = Math.max(0, (data.length - visibleCount) * itemHeight);

  const computeRaw = useCallback(
    (offsetY: number) => {
      if (cycle === 0) return 0;
      const raw = Math.round(offsetY / itemHeight) + halfSlots;
      return Math.max(pad, Math.min(pad + cycle - 1, raw));
    },
    [itemHeight, halfSlots, pad, cycle],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!didInitRef.current) return;
      const y = event.nativeEvent.contentOffset.y;
      lastOffsetRef.current = y;
      const raw = computeRaw(y);
      if (raw !== lastRawRef.current) {
        lastRawRef.current = raw;
        const value = raw - pad;
        setSelectedIndex(value);
        onChange?.(value);
      }
    },
    [computeRaw, pad, onChange],
  );

  const settle = useCallback(
    (y: number) => {
      if (!didInitRef.current) return;
      const raw = computeRaw(y);
      const snappedOffset = Math.max(0, Math.min(maxOffset, (raw - halfSlots) * itemHeight));

      if (Math.abs(y - snappedOffset) > 0.5) {
        listRef.current?.scrollToOffset({ offset: snappedOffset, animated: false });
      }

      lastRawRef.current = raw;
      const value = raw - pad;
      setSelectedIndex(value);
      onChange?.(value);
    },
    [computeRaw, halfSlots, itemHeight, maxOffset, pad, onChange],
  );

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      handleScroll(event);
      settle(event.nativeEvent.contentOffset.y);
    },
    [handleScroll, settle],
  );

  const handleScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const velocity = event.nativeEvent.velocity?.y ?? 0;
      if (Math.abs(velocity) < 0.25) {
        handleScroll(event);
        settle(event.nativeEvent.contentOffset.y);
      }
    },
    [handleScroll, settle],
  );

  const handleContentSizeChange = useCallback(() => {
    if (!didInitRef.current && listRef.current && initRaw >= halfSlots) {
      didInitRef.current = true;
      listRef.current.scrollToOffset({
        offset: (initRaw - halfSlots) * itemHeight,
        animated: false,
      });
    }
  }, [initRaw, halfSlots, itemHeight]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<string>) => {
      if (!item) {
        return <View style={[styles.itemSlot, { height: itemHeight }]} />;
      }
      const distance = Math.min(MAX_VISUAL_DISTANCE, Math.abs(index - (pad + selectedIndex)));
      return <Row label={item} distance={distance} itemHeight={itemHeight} />;
    },
    [pad, selectedIndex, itemHeight],
  );

  const keyExtractor = useCallback((_: string, index: number) => String(index), []);

  const getItemLayout = useCallback(
    (_: ArrayLike<string> | null | undefined, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    }),
    [itemHeight],
  );

  if (cycle === 0) {
    return <View style={[styles.container, { height: wheelHeight }]} />;
  }

  return (
    <View style={[styles.container, { height: wheelHeight }]}>
      <View
        pointerEvents="none"
        style={[
          styles.highlight,
          {
            height: itemHeight,
            top: (wheelHeight - itemHeight) / 2,
            backgroundColor: highlightColor ?? theme.accentSoft,
          },
        ]}
      />

      <FlatList
        ref={listRef}
        style={styles.scroll}
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        initialScrollIndex={Math.max(0, initRaw - halfSlots)}
        initialNumToRender={visibleCount + 2}
        maxToRenderPerBatch={12}
        updateCellsBatchingPeriod={32}
        windowSize={5}
        extraData={selectedIndex}
        onContentSizeChange={handleContentSizeChange}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={false}
        scrollEventThrottle={16}
        snapToInterval={itemHeight}
        snapToAlignment="start"
        decelerationRate={0.998}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumEnd}
      />

      <LinearGradient
        pointerEvents="none"
        colors={[theme.backgroundElement, 'transparent']}
        style={styles.maskTop}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', theme.backgroundElement]}
        style={styles.maskBottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
    alignSelf: 'stretch',
  },
  itemSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    fontSize: 22,
    lineHeight: 28,
    fontVariant: ['tabular-nums'],
  },
  highlight: {
    position: 'absolute',
    left: -16,
    right: -16,
    borderRadius: Radius.full,
  },
  maskTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
  },
  maskBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 56,
  },
});
