import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { PressableProps, StyleProp, TextStyle, ViewStyle } from 'react-native';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Pencil,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { interaction, radius, shadow, spacing, touchTarget } from '@/constants/designTokens';
import { useI18n } from '@/hooks/useI18n';
import { useMotionPreference } from '@/hooks/useMotionPreference';
import { useThemeColors } from '@/hooks/useThemeColors';

type Tone = 'light' | 'dark';
type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const statusPalette: Record<StatusVariant, { bg: string; text: string; border: string }> = {
  success: { bg: '#E6F8EE', text: colors.green, border: '#B9EBD0' },
  warning: { bg: '#FFF6DB', text: colors.orange, border: '#FFE7A3' },
  danger: { bg: '#FFE7E9', text: colors.red, border: '#FFC7CC' },
  info: { bg: '#E8F1FF', text: colors.blue, border: '#C7DAFF' },
  neutral: { bg: '#F1F5F9', text: colors.grayText, border: colors.border },
};

function softAccent(accent: string) {
  if (accent === colors.red) return '#FFE7E9';
  if (accent === colors.green) return '#E6F8EE';
  if (accent === colors.blue) return '#E8F1FF';
  if (accent === colors.orange) return '#FFF6DB';
  if (accent === colors.purple) return '#F1E8FF';
  return '#E8F1FF';
}

function useRevealAnimation(delay = 0) {
  const { shouldAnimate } = useMotionPreference();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.stopAnimation();
    if (!shouldAnimate) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, progress, shouldAnimate]);

  return {
    opacity: progress,
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  };
}

interface AnimatedPressableProps extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  wrapperStyle?: StyleProp<ViewStyle>;
  pressScale?: number;
}

export function AnimatedPressable({
  children,
  disabled,
  onPressIn,
  onPressOut,
  pressScale = interaction.pressScale,
  style,
  wrapperStyle,
  ...props
}: AnimatedPressableProps) {
  const { shouldAnimate } = useMotionPreference();
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (value: number) => {
    if (!shouldAnimate) {
      scale.setValue(1);
      return;
    }
    Animated.spring(scale, {
      toValue: value,
      friction: 7,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[wrapperStyle, { transform: [{ scale }], opacity: disabled ? interaction.disabledOpacity : 1 }]}>
      <Pressable
        {...props}
        disabled={disabled}
        onPressIn={(event) => {
          if (!disabled) animate(pressScale);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          if (!disabled) animate(1);
          onPressOut?.(event);
        }}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

interface AppButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  accent?: string;
  icon?: ReactNode;
  loading?: boolean;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
  wrapperStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function AppButton({
  label,
  variant = 'primary',
  accent = colors.red,
  icon,
  loading,
  disabled,
  tone = 'light',
  style,
  wrapperStyle,
  textStyle,
  ...props
}: AppButtonProps) {
  const theme = useThemeColors();
  const { t } = useI18n();
  const dark = tone === 'dark';
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';
  const textColor = isPrimary ? colors.white : dark || theme.isDark ? theme.text : accent;

  return (
    <AnimatedPressable
      {...props}
      accessibilityRole="button"
      disabled={disabled || loading}
      wrapperStyle={wrapperStyle}
      style={[
        styles.appButton,
        isPrimary && { backgroundColor: accent, borderColor: accent },
        variant === 'secondary' && [
          styles.appButtonSecondary,
          {
            borderColor: dark || theme.isDark ? theme.line : softAccent(accent),
            backgroundColor: dark || theme.isDark ? theme.surfaceSoft : theme.surface,
          },
        ],
        isGhost && styles.appButtonGhost,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.appButtonContent}>
          {icon}
          <Text style={[styles.appButtonText, { color: textColor }, textStyle]}>{t(label)}</Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

interface LoadingStateProps {
  label?: string;
  tone?: Tone;
}

export function LoadingState({ label = 'Carregando informações...', tone = 'light' }: LoadingStateProps) {
  const theme = useThemeColors();
  const { t } = useI18n();
  const { shouldAnimate } = useMotionPreference();
  const dark = tone === 'dark';
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pulse.stopAnimation();
    if (!shouldAnimate) {
      pulse.setValue(0.55);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 760,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 760,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [pulse, shouldAnimate]);

  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.8] });

  return (
    <View style={styles.loadingWrap}>
      <Animated.View
        style={[
          styles.loadingHalo,
          { opacity: pulseOpacity, backgroundColor: dark || theme.isDark ? theme.surfaceSoft : theme.surfaceSoft },
        ]}
      />
      <ActivityIndicator size="large" color={dark || theme.isDark ? theme.text : colors.navy} />
      <Text style={[styles.loadingText, { color: dark || theme.isDark ? theme.textMuted : colors.grayText }]}>
        {t(label)}
      </Text>
    </View>
  );
}

interface FeedbackMessageProps {
  message: string;
  variant?: StatusVariant;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}

export function FeedbackMessage({
  message,
  variant = 'info',
  tone = 'light',
  style,
}: FeedbackMessageProps) {
  const theme = useThemeColors();
  const { t } = useI18n();
  const palette = statusPalette[variant];
  const dark = tone === 'dark' || theme.isDark;
  const revealStyle = useRevealAnimation();
  const iconColor = dark ? colors.white : palette.text;
  const icon =
    variant === 'success' ? (
      <CheckCircle2 size={17} color={iconColor} />
    ) : variant === 'danger' ? (
      <XCircle size={17} color={iconColor} />
    ) : variant === 'warning' ? (
      <AlertTriangle size={17} color={iconColor} />
    ) : (
      <Info size={17} color={iconColor} />
    );

  return (
    <Animated.View
      style={[
        styles.feedback,
        {
          backgroundColor: dark ? 'rgba(255,255,255,0.08)' : palette.bg,
          borderColor: dark ? theme.line : palette.border,
        },
        revealStyle,
        style,
      ]}
    >
      {icon}
      <Text style={[styles.feedbackText, { color: dark ? colors.white : palette.text }]}>
        {t(message)}
      </Text>
    </Animated.View>
  );
}

interface SurfaceCardProps {
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  tone?: Tone;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SurfaceCard({
  title,
  subtitle,
  actionLabel,
  onActionPress,
  tone = 'light',
  children,
  style,
}: SurfaceCardProps) {
  const theme = useThemeColors();
  const { t } = useI18n();
  const dark = tone === 'dark' || theme.isDark;
  const revealStyle = useRevealAnimation();

  return (
    <Animated.View
      style={[
        styles.surface,
        {
          backgroundColor: dark ? theme.surface : colors.panel,
          borderColor: dark ? theme.line : colors.border,
        },
        revealStyle,
        style,
      ]}
    >
      {title ? (
        <View style={styles.surfaceHeader}>
          <View style={styles.surfaceTitleWrap}>
            <Text style={[styles.surfaceTitle, { color: dark ? theme.text : colors.navy }]}>{t(title)}</Text>
            {subtitle ? (
              <Text style={[styles.surfaceSubtitle, { color: dark ? theme.textMuted : colors.grayText }]}>
                {t(subtitle)}
              </Text>
            ) : null}
          </View>
          {actionLabel ? (
            <AnimatedPressable
              style={[styles.surfaceAction, { borderColor: dark ? theme.line : colors.border }]}
              onPress={onActionPress}
              disabled={!onActionPress}
            >
              <Text style={[styles.surfaceActionText, { color: dark ? theme.text : colors.navy }]}>
                {t(actionLabel)}
              </Text>
            </AnimatedPressable>
          ) : null}
        </View>
      ) : null}
      {children}
    </Animated.View>
  );
}

interface MetricTileProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
  icon?: ReactNode;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}

export function MetricTile({
  label,
  value,
  hint,
  accent = colors.navy,
  icon,
  tone = 'light',
  style,
}: MetricTileProps) {
  const theme = useThemeColors();
  const { t } = useI18n();
  const dark = tone === 'dark' || theme.isDark;
  const revealStyle = useRevealAnimation();

  return (
    <Animated.View
      style={[
        styles.metric,
        {
          borderLeftColor: accent,
          backgroundColor: dark ? theme.surface : colors.panel,
          borderColor: dark ? theme.line : colors.border,
        },
        revealStyle,
        style,
      ]}
    >
      <View style={styles.metricTop}>
        <View style={[styles.metricIcon, { backgroundColor: softAccent(accent) }]}>{icon}</View>
        {hint ? <Text style={[styles.metricHint, { color: dark ? theme.textMuted : colors.grayText }]}>{t(hint)}</Text> : null}
      </View>
      <Text style={[styles.metricValue, { color: dark ? theme.text : colors.navy }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: dark ? theme.textMuted : colors.grayText }]}>{t(label)}</Text>
    </Animated.View>
  );
}

interface PillProps {
  label: string;
  variant?: StatusVariant;
  tone?: Tone;
}

export function Pill({ label, variant = 'neutral', tone = 'light' }: PillProps) {
  const theme = useThemeColors();
  const { t } = useI18n();
  const palette = statusPalette[variant];
  const dark = tone === 'dark' || theme.isDark;

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: dark ? 'rgba(255,255,255,0.08)' : palette.bg, borderColor: dark ? theme.line : palette.border },
      ]}
    >
      <Text style={[styles.pillText, { color: dark ? colors.white : palette.text }]}>{t(label)}</Text>
    </View>
  );
}

interface SearchFieldProps {
  placeholder: string;
  value?: string;
  onChangeText?: (value: string) => void;
  tone?: Tone;
}

export function SearchField({ placeholder, value, onChangeText, tone = 'light' }: SearchFieldProps) {
  const theme = useThemeColors();
  const { t } = useI18n();
  const dark = tone === 'dark' || theme.isDark;
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.search,
        {
          backgroundColor: dark ? theme.input : colors.white,
          borderColor: focused ? theme.inputFocused : dark ? theme.line : colors.border,
        },
      ]}
    >
      <Search size={17} color={dark ? theme.textSubtle : colors.grayText} />
      <TextInput
        accessibilityLabel={t(placeholder)}
        style={[styles.searchInput, { color: dark ? theme.text : colors.navy }]}
        placeholder={t(placeholder)}
        placeholderTextColor={dark ? theme.textSubtle : colors.grayText}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

interface ListRowProps {
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: string;
  badgeVariant?: StatusVariant;
  initials?: string;
  imageUri?: string | null;
  accent?: string;
  tone?: Tone;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ListRow({
  title,
  subtitle,
  meta,
  badge,
  badgeVariant = 'neutral',
  initials,
  imageUri,
  accent = colors.navy,
  tone = 'light',
  onPress,
  onEdit,
  onDelete,
}: ListRowProps) {
  const theme = useThemeColors();
  const { t } = useI18n();
  const dark = tone === 'dark' || theme.isDark;
  const rowMainContent = (
    <>
      {imageUri || initials ? (
        <View style={[styles.avatar, { backgroundColor: dark ? theme.surface : softAccent(accent) }]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarText, { color: accent }]}>{initials}</Text>
          )}
        </View>
      ) : null}
      <View style={styles.rowBody}>
        <Text numberOfLines={1} style={[styles.rowTitle, { color: dark ? theme.text : colors.navy }]}>
          {t(title)}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[styles.rowSubtitle, { color: dark ? theme.textMuted : colors.grayText }]}>
            {t(subtitle)}
          </Text>
        ) : null}
      </View>
      <View style={styles.rowAside}>
        {badge ? <Pill label={badge} variant={badgeVariant} tone={tone} /> : null}
        {meta ? <Text style={[styles.rowMeta, { color: dark ? theme.textMuted : colors.grayText }]}>{t(meta)}</Text> : null}
      </View>
    </>
  );
  const rowActions = onEdit || onDelete ? (
    <View style={styles.rowActions}>
      {onEdit ? (
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={`Editar ${title}`}
          hitSlop={8}
          style={[
            styles.rowActionButton,
            { backgroundColor: dark ? theme.surface : colors.white, borderColor: dark ? theme.line : colors.border },
          ]}
          onPress={onEdit}
        >
          <Pencil size={14} color={dark ? theme.text : colors.navy} />
        </AnimatedPressable>
      ) : null}
      {onDelete ? (
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={`Excluir ${title}`}
          hitSlop={8}
          style={[
            styles.rowActionButton,
            { backgroundColor: dark ? theme.surface : colors.white, borderColor: dark ? theme.line : colors.border },
          ]}
          onPress={onDelete}
        >
          <Trash2 size={14} color={colors.red} />
        </AnimatedPressable>
      ) : null}
    </View>
  ) : null;

  const rowStyle = [
    styles.row,
    {
      backgroundColor: dark ? theme.surfaceSoft : colors.white,
      borderColor: dark ? theme.line : colors.border,
    },
  ];

  if (onPress && rowActions) {
    return (
      <View style={rowStyle}>
        <Pressable
          accessibilityRole="button"
          style={styles.rowMain}
          onPress={onPress}
        >
          {rowMainContent}
        </Pressable>
        {rowActions}
      </View>
    );
  }

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        style={rowStyle}
        onPress={onPress}
      >
        {rowMainContent}
      </Pressable>
    );
  }

  return (
    <View style={rowStyle}>
      {rowMainContent}
      {rowActions}
    </View>
  );
}

interface ProgressBarProps {
  value: number;
  accent?: string;
  tone?: Tone;
}

export function ProgressBar({ value, accent = colors.red, tone = 'light' }: ProgressBarProps) {
  const theme = useThemeColors();
  const safeValue = Math.max(0, Math.min(100, value));
  const dark = tone === 'dark' || theme.isDark;

  return (
    <View style={[styles.progressTrack, { backgroundColor: dark ? theme.surfaceSoft : colors.panelSoft }]}>
      <View style={[styles.progressFill, { width: `${safeValue}%`, backgroundColor: accent }]} />
    </View>
  );
}

interface MiniBarsProps {
  data: { label: string; value: number; color?: string }[];
  tone?: Tone;
}

export function MiniBars({ data, tone = 'light' }: MiniBarsProps) {
  const theme = useThemeColors();
  const { t } = useI18n();
  const max = Math.max(...data.map((item) => item.value), 1);
  const dark = tone === 'dark' || theme.isDark;

  return (
    <View style={styles.bars}>
      {data.map((item) => {
        const height = Math.max(14, Math.round((item.value / max) * 78));
        return (
          <View key={item.label} style={styles.barColumn}>
            <View style={[styles.barTrack, { backgroundColor: dark ? theme.surfaceSoft : colors.panelSoft }]}>
              <View
                style={[
                  styles.barFill,
                  { height, backgroundColor: item.color ?? colors.red },
                ]}
              />
            </View>
            <Text style={[styles.barLabel, { color: dark ? theme.textMuted : colors.grayText }]}>{t(item.label)}</Text>
          </View>
        );
      })}
    </View>
  );
}

interface RingMetricProps {
  value: string | number;
  label: string;
  accent?: string;
  tone?: Tone;
}

export function RingMetric({ value, label, accent = colors.green, tone = 'light' }: RingMetricProps) {
  const theme = useThemeColors();
  const { t } = useI18n();
  const dark = tone === 'dark' || theme.isDark;

  return (
    <View style={styles.ringWrap}>
      <View style={[styles.ring, { borderColor: accent, backgroundColor: dark ? theme.surfaceSoft : colors.white }]}>
        <Text style={[styles.ringValue, { color: dark ? theme.text : accent }]}>{value}</Text>
      </View>
      <Text style={[styles.ringLabel, { color: dark ? theme.textMuted : colors.grayText }]}>{t(label)}</Text>
    </View>
  );
}

export function CampusMap({ tone = 'light' }: { tone?: Tone }) {
  const dark = tone === 'dark';
  const blocks = [
    { label: 'BLOCO A', top: '18%', left: '9%', width: '25%', height: 44 },
    { label: 'BLOCO B', top: '40%', left: '15%', width: '28%', height: 42 },
    { label: 'BLOCO C', top: '24%', left: '58%', width: '30%', height: 46 },
    { label: 'OFICINAS', top: '62%', left: '44%', width: '34%', height: 42 },
    { label: 'SECRETARIA', top: '69%', left: '8%', width: '28%', height: 38 },
  ] as const;
  const pins = [
    { top: '14%', left: '45%', color: colors.orange },
    { top: '34%', left: '36%', color: colors.blue },
    { top: '53%', left: '75%', color: colors.green },
    { top: '69%', left: '39%', color: colors.red },
  ] as const;

  return (
    <View style={[styles.map, dark && styles.mapDark]}>
      <View style={styles.mapPathHorizontal} />
      <View style={styles.mapPathVertical} />
      {blocks.map((block) => (
        <View
          key={block.label}
          style={[
            styles.mapBlock,
            dark && styles.mapBlockDark,
            {
              top: block.top,
              left: block.left,
              width: block.width,
              height: block.height,
            } as ViewStyle,
          ]}
        >
          <Text style={[styles.mapBlockText, dark && styles.textOnDark]}>{block.label}</Text>
        </View>
      ))}
      {pins.map((pin, index) => (
        <View
          key={`${pin.top}-${pin.left}`}
          style={[
            styles.mapPin,
            { top: pin.top, left: pin.left, borderColor: pin.color } as ViewStyle,
          ]}
        >
          <Text style={[styles.mapPinText, { color: pin.color }]}>{index + 1}</Text>
        </View>
      ))}
    </View>
  );
}

export function FieldPreview({ label, value }: { label: string; value: string }) {
  const theme = useThemeColors();
  const { t } = useI18n();
  return (
    <View style={[styles.fieldPreview, { backgroundColor: theme.isDark ? theme.surface : colors.white, borderColor: theme.isDark ? theme.line : colors.border }]}>
      <Text style={[styles.fieldLabel, { color: theme.isDark ? theme.textMuted : colors.grayText }]}>{t(label)}</Text>
      <Text numberOfLines={1} style={[styles.fieldValue, { color: theme.isDark ? theme.text : colors.navy }]}>
        {t(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  appButton: {
    minHeight: touchTarget.min,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  appButtonSecondary: {
    backgroundColor: colors.white,
  },
  appButtonGhost: {
    minHeight: 38,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  appButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  appButtonText: { fontSize: 13, fontWeight: '900' },
  loadingWrap: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingHalo: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  loadingText: {
    color: colors.grayText,
    fontSize: 12,
    fontWeight: '800',
  },
  feedback: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  feedbackText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  surface: {
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  surfaceDark: {
    backgroundColor: colors.darkPanel,
    borderColor: colors.borderDark,
    shadowOpacity: 0,
  },
  surfaceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  surfaceTitleWrap: { flex: 1 },
  surfaceTitle: { color: colors.navy, fontSize: 15, fontWeight: '800' },
  surfaceSubtitle: { marginTop: 3, color: colors.grayText, fontSize: 12 },
  surfaceAction: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  surfaceActionDark: { borderColor: colors.borderDark },
  surfaceActionText: { color: colors.navy, fontSize: 11, fontWeight: '800' },
  surfaceActionTextDark: { color: colors.white },
  metric: {
    flex: 1,
    minWidth: 128,
    backgroundColor: colors.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderColor: colors.border,
    padding: 12,
  },
  metricDark: {
    backgroundColor: colors.darkPanel,
    borderColor: colors.borderDark,
  },
  metricTop: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  metricIcon: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricHint: { color: colors.grayText, fontSize: 10, fontWeight: '700' },
  metricValue: { color: colors.navy, fontSize: 24, fontWeight: '900' },
  metricLabel: { color: colors.grayText, fontSize: 11, marginTop: 2 },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: { fontSize: 10, fontWeight: '800' },
  search: {
    minHeight: touchTarget.min,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchDark: {
    backgroundColor: colors.darkPanel,
    borderColor: colors.borderDark,
  },
  searchInput: {
    flex: 1,
    color: colors.navy,
    fontSize: 13,
    paddingVertical: 8,
  },
  searchInputDark: { color: colors.white },
  row: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 10,
    marginBottom: 8,
  },
  rowDark: {
    backgroundColor: colors.darkPanelSoft,
    borderColor: colors.borderDark,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 12, fontWeight: '900' },
  rowMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.navy, fontSize: 13, fontWeight: '800' },
  rowSubtitle: { color: colors.grayText, fontSize: 11, marginTop: 3 },
  rowAside: { alignItems: 'flex-end', gap: 4 },
  rowMeta: { color: colors.grayText, fontSize: 10, fontWeight: '700' },
  rowActions: { flexDirection: 'row', gap: 6, zIndex: 2 },
  rowActionButton: {
    width: 30,
    height: 30,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowActionButtonDark: {
    borderColor: colors.borderDark,
    backgroundColor: colors.darkPanel,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.panelSoft,
    overflow: 'hidden',
  },
  progressTrackDark: { backgroundColor: colors.darkPanelSoft },
  progressFill: { height: '100%', borderRadius: 999 },
  bars: {
    height: 112,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 7,
  },
  barColumn: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: {
    height: 82,
    width: '100%',
    borderRadius: 7,
    backgroundColor: colors.panelSoft,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barTrackDark: { backgroundColor: colors.darkPanelSoft },
  barFill: { width: '100%', borderTopLeftRadius: 7, borderTopRightRadius: 7 },
  barLabel: { color: colors.grayText, fontSize: 9, fontWeight: '700' },
  ringWrap: { alignItems: 'center', gap: 8 },
  ring: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringDark: { backgroundColor: colors.darkPanelSoft },
  ringValue: { fontSize: 18, fontWeight: '900' },
  ringLabel: { color: colors.grayText, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  map: {
    height: 290,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#DDEBD8',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  mapDark: {
    backgroundColor: '#103650',
    borderColor: colors.borderDark,
  },
  mapPathHorizontal: {
    position: 'absolute',
    top: '48%',
    left: '-10%',
    right: '-10%',
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.55)',
    transform: [{ rotate: '-10deg' }],
  },
  mapPathVertical: {
    position: 'absolute',
    top: '-8%',
    left: '47%',
    width: 22,
    bottom: '-8%',
    backgroundColor: 'rgba(255,255,255,0.45)',
    transform: [{ rotate: '14deg' }],
  },
  mapBlock: {
    position: 'absolute',
    borderRadius: 7,
    backgroundColor: '#0B2F4F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  mapBlockDark: {
    backgroundColor: '#061B33',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  mapBlockText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },
  mapPin: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPinText: { fontSize: 10, fontWeight: '900' },
  fieldPreview: {
    flex: 1,
    minWidth: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: colors.white,
  },
  fieldLabel: { color: colors.grayText, fontSize: 10, fontWeight: '700' },
  fieldValue: { color: colors.navy, fontSize: 12, fontWeight: '800', marginTop: 4 },
  textOnDark: { color: colors.white },
  mutedOnDark: { color: colors.mutedText },
});
