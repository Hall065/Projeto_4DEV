import { Children, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
  View,
} from 'react-native';
import { motion } from '@/constants/designTokens';
import { useMotionPreference } from '@/hooks/useMotionPreference';
import { useThemeColors } from '@/hooks/useThemeColors';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Reveal({ children, delay = 0, enabled = true, style }: RevealProps) {
  const { shouldAnimate } = useMotionPreference();
  const progress = useRef(new Animated.Value(shouldAnimate && enabled ? 0 : 1)).current;

  useEffect(() => {
    progress.stopAnimation();
    if (!shouldAnimate || !enabled) {
      progress.setValue(1);
      return;
    }

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: motion.base,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, enabled, progress, shouldAnimate]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [motion.revealOffset, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

interface StaggerListProps {
  children: ReactNode;
  enabled?: boolean;
  limit?: number;
  style?: StyleProp<ViewStyle>;
}

export function StaggerList({ children, enabled = true, limit = 6, style }: StaggerListProps) {
  return (
    <View style={style}>
      {Children.toArray(children).map((child, index) => (
        <Reveal key={index} enabled={enabled} delay={index < limit ? index * motion.stagger : 0}>
          {child}
        </Reveal>
      ))}
    </View>
  );
}

interface CountUpProps {
  value: number;
  format?: (value: number) => string;
  style?: StyleProp<ViewStyle>;
}

export function CountUp({ value, format = (current) => String(current), style }: CountUpProps) {
  const { shouldAnimate } = useMotionPreference();
  const progress = useRef(new Animated.Value(1)).current;
  const previousValue = useRef(value);
  const [displayedValue, setDisplayedValue] = useState(value);

  useEffect(() => {
    const from = previousValue.current;
    previousValue.current = value;
    progress.stopAnimation();

    if (!shouldAnimate || from === value) {
      setDisplayedValue(value);
      progress.setValue(1);
      return;
    }

    progress.setValue(0);
    const listener = progress.addListener(({ value: amount }) => {
      setDisplayedValue(Math.round(from + (value - from) * amount));
    });
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: motion.base,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) setDisplayedValue(value);
    });
    return () => {
      progress.removeListener(listener);
      animation.stop();
    };
  }, [progress, shouldAnimate, value]);

  return <Text style={style as never}>{format(displayedValue)}</Text>;
}

export function SkeletonListRow() {
  const theme = useThemeColors();
  const { shouldAnimate } = useMotionPreference();
  const pulse = useRef(new Animated.Value(shouldAnimate ? 0.42 : 0.72)).current;

  useEffect(() => {
    pulse.stopAnimation();
    if (!shouldAnimate) {
      pulse.setValue(0.72);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.82, duration: 760, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.42, duration: 760, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, shouldAnimate]);

  return (
    <View style={[styles.skeletonRow, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      <Animated.View style={[styles.avatar, { opacity: pulse, backgroundColor: theme.surfaceSoft }]} />
      <View style={styles.copy}>
        <Animated.View style={[styles.line, { opacity: pulse, backgroundColor: theme.surfaceSoft }]} />
        <Animated.View style={[styles.shortLine, { opacity: pulse, backgroundColor: theme.surfaceSoft }]} />
      </View>
    </View>
  );
}

export function SkeletonChart() {
  return (
    <View style={styles.chart}>
      <SkeletonListRow />
      <SkeletonListRow />
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonRow: {
    minHeight: 68,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  copy: { flex: 1, gap: 8 },
  line: { height: 12, borderRadius: 6, width: '78%' },
  shortLine: { height: 10, borderRadius: 5, width: '48%' },
  chart: { gap: 10 },
});
