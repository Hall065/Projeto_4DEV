import { StyleSheet, Text, View } from 'react-native';
import { Inbox } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { useThemeColors } from '@/hooks/useThemeColors';

interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  const theme = useThemeColors();
  const { t } = useI18n();
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: theme.isDark ? theme.surfaceSoft : '#E8F1FF', borderColor: theme.isDark ? theme.line : '#C7DAFF' }]}>
        <Inbox size={26} color={colors.blue} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{t(title)}</Text>
      {description ? <Text style={[styles.description, { color: theme.textMuted }]}>{t(description)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#E8F1FF',
    borderWidth: 1,
    borderColor: '#C7DAFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.navy,
    textAlign: 'center',
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    color: colors.grayText,
    textAlign: 'center',
  },
});
