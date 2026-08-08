import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type WheelPickerProps = {
  items: readonly string[];
  /** Only applied on the first mount. */
  initialIndex?: number;
  onChange?: (index: number) => void;
  itemHeight?: number;
  visibleCount?: number;
  highlightColor?: string;
};

export function WheelPicker({
  items,
  initialIndex = 0,
  onChange,
  itemHeight = 44,
  visibleCount = 5,
  highlightColor,
}: WheelPickerProps) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const initializedRef = useRef(false);
  const lastIndexRef = useRef(initialIndex);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  const wheelHeight = itemHeight * visibleCount;

  const computeIndex = (y: number) => {
    const raw = Math.floor(y / itemHeight);
    return Math.max(0, Math.min(items.length - 1, raw));
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = computeIndex(event.nativeEvent.contentOffset.y);
    if (index !== lastIndexRef.current) {
      lastIndexRef.current = index;
      setSelectedIndex(index);
      onChange?.(index);
    }
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = computeIndex(event.nativeEvent.contentOffset.y);
    scrollRef.current?.scrollTo({ y: index * itemHeight, animated: true });
    if (index !== lastIndexRef.current) {
      lastIndexRef.current = index;
      setSelectedIndex(index);
      onChange?.(index);
    }
  };

  const handleContentSizeChange = () => {
    if (!initializedRef.current && scrollRef.current) {
      initializedRef.current = true;
      scrollRef.current.scrollTo({ y: initialIndex * itemHeight, animated: false });
    }
  };

  return (
    <View style={[styles.container, { height: wheelHeight }]}>
      <View
        pointerEvents="none"
        style={[
          styles.highlight,
          {
            height: itemHeight,
            top: (wheelHeight - itemHeight) / 2,
            backgroundColor: highlightColor ?? theme.backgroundSelected,
          },
        ]}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        snapToInterval={itemHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum={Platform.OS === 'android'}
        onContentSizeChange={handleContentSizeChange}
        contentContainerStyle={{ paddingVertical: (wheelHeight - itemHeight) / 2 }}>
        {items.map((item, index) => {
          const distance = Math.abs(index - selectedIndex);
          const scale = Math.max(0.9, 1 - distance * 0.05);
          return (
            <View
              key={item}
              style={[styles.itemSlot, { height: itemHeight }]}>
              <ThemedText
                style={[
                  styles.item,
                  {
                    color: distance === 0 ? theme.accent : theme.textSecondary,
                    opacity: Math.max(0.4, 1 - distance * 0.2),
                    fontWeight: distance === 0 ? '700' : '500',
                    transform: [{ scale }],
                  },
                ]}>
                {item}
              </ThemedText>
            </View>
          );
        })}
      </ScrollView>

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
    left: 0,
    right: 0,
    borderRadius: 12,
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
