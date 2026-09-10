import { StyleSheet, Text, View } from 'react-native';
import { AnimataPressable } from '@/components/common/AnimataPrimitives';
import { colors } from '@/constants/colors';
import { radius, shadow } from '@/constants/designTokens';
import { useThemeColors } from '@/hooks/useThemeColors';
import { StatusBadge } from './StatusBadge';

interface DataCardProps {
  title: string;
  subtitle?: string;
  statusLabel?: string;
  onPress?: () => void;
}

export function DataCard({ title, subtitle, statusLabel, onPress }: DataCardProps) {
  const theme = useThemeColors();

  return (
    <AnimataPressable
      haptic={Boolean(onPress)}
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}
      onPress={onPress}
    >
      <View style={[styles.avatar, { backgroundColor: theme.isDark ? 'rgba(227,6,19,0.16)' : '#FFE7E9' }]}>
        <Text style={styles.avatarText}>
          {title
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase()}
        </Text>
      </View>
      <View style={styles.content}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {statusLabel ? <StatusBadge label={statusLabel} variant="success" /> : null}
    </AnimataPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFE7E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.red, fontSize: 12, fontWeight: '900' },
  content: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: '800', color: colors.navy },
  subtitle: { marginTop: 3, fontSize: 11, lineHeight: 16, color: colors.grayText },
});
