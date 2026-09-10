import * as Haptics from 'expo-haptics';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
  View,
} from 'react-native';
import { interaction, motion, radius } from '@/constants/designTokens';
import { useMotionPreference } from '@/hooks/useMotionPreference';

interface AtmosphericGlowProps {
  accent?: string;
}

/** Native, reduced-motion-safe interpretation of Animata's blurry background. */
export function AtmosphericGlow({ accent = '#E30613' }: AtmosphericGlowProps) {
  const { shouldAnimate } = useMotionPreference();
  const progress = useRef(new Animated.Value(shouldAnimate ? 0 : 1)).current;

  useEffect(() => {
    if (!shouldAnimate) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: motion.slow,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, shouldAnimate]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden>
      <Animated.View
        style={[
          styles.glowLarge,
          {
            backgroundColor: accent,
            opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.2] }),
            transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }) }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.glowSmall,
          {
            opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] }),
            transform: [
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
              { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
            ],
          },
        ]}
      />
    </View>
  );
}

interface AnimataPressableProps extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  wrapperStyle?: StyleProp<ViewStyle>;
  rippleColor?: string;
  haptic?: boolean;
}

/** Scale + radial feedback inspired by Animata's ripple buttons, implemented for Expo. */
export function AnimataPressable({
  children,
  disabled,
  haptic = true,
  onPressIn,
  onPressOut,
  rippleColor = 'rgba(255,255,255,0.24)',
  style,
  wrapperStyle,
  ...props
}: AnimataPressableProps) {
  const { shouldAnimate } = useMotionPreference();
  const scale = useRef(new Animated.Value(1)).current;
  const ripple = useRef(new Animated.Value(0)).current;

  const animateScale = (toValue: number) => {
    if (!shouldAnimate) return;
    Animated.spring(scale, {
      toValue,
      friction: 8,
      tension: 150,
      useNativeDriver: true,
    }).start();
  };

  const handlePressIn = (event: GestureResponderEvent) => {
    if (haptic) void Haptics.selectionAsync().catch(() => undefined);
    if (shouldAnimate) {
      ripple.setValue(0);
      Animated.timing(ripple, {
        toValue: 1,
        duration: motion.base,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      animateScale(interaction.pressScale);
    }
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    animateScale(1);
    onPressOut?.(event);
  };

  return (
    <Animated.View
      style={[
        wrapperStyle,
        { opacity: disabled ? interaction.disabledOpacity : 1, transform: [{ scale }] },
      ]}
    >
      <Pressable
        {...props}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.pressable, style]}
      >
        {children}
        {shouldAnimate ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ripple,
              {
                backgroundColor: rippleColor,
                opacity: ripple.interpolate({ inputRange: [0, 0.72, 1], outputRange: [0, 0.2, 0] }),
                transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.05, 1] }) }],
              },
            ]}
          />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glowLarge: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    right: -110,
    top: -120,
  },
  glowSmall: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    left: -80,
    bottom: -105,
    backgroundColor: '#38BDF8',
  },
  pressable: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radius.card,
  },
  ripple: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 260,
    left: '50%',
    top: '50%',
    marginLeft: -260,
    marginTop: -260,
  },
});
