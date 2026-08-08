import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'success' | 'ghost' | 'danger';

export type ButtonProps = PressableProps & {
  label: string;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  variant = 'primary',
  size = 'lg',
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();

  const isFilled = variant === 'primary' || variant === 'success';
  const backgroundColor = variant === 'primary' ? theme.accent : variant === 'success' ? theme.success : 'transparent';
  const color =
    isFilled ? theme.onAccent : variant === 'danger' ? '#F04438' : theme.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        isFilled ? styles.filled : styles.ghost,
        size === 'lg' ? styles.lg : styles.md,
        { backgroundColor },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}>
      <ThemedText style={[styles.label, { color }, size === 'lg' ? styles.labelLg : styles.labelMd]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  filled: {
    borderRadius: Radius.md,
  },
  ghost: {
    borderRadius: Radius.md,
  },
  lg: {
    height: 56,
    paddingHorizontal: Spacing.five,
  },
  md: {
    height: 44,
    paddingHorizontal: Spacing.four,
  },
  label: {
    fontWeight: 700,
  },
  labelLg: {
    fontSize: 16,
    lineHeight: 22,
  },
  labelMd: {
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.45,
  },
});
