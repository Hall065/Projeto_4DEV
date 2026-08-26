import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { NotificationsModal } from '@/components/notifications/NotificationsModal';
import { connectTheme } from '@/constants/colors';
import { ALUNO_BOTTOM_NAV } from '@/constants/navigation';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuthStore } from '@/stores/auth.store';

export default function AlunoLayout() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const theme = useThemeColors();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifications = useNotifications(session?.userId);

  useEffect(() => {
    if (!session) {
      router.replace('/login');
      return;
    }
    if (session.perfil?.tipo !== 'aluno') {
      router.replace('/hub');
    }
  }, [router, session]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.appBackground }}>
      <AppHeader
        title="SENAI Aluno"
        brandArea="connect"
        showMenu={false}
        profileRoute="/aluno/perfil"
        accentColor={theme.isDark ? theme.connectHeader : connectTheme.primary}
        notificationCount={notifications.unreadCount}
        onNotificationsPress={() => setNotificationsOpen(true)}
      />
      <View style={{ flex: 1, backgroundColor: theme.appBackground }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade_from_bottom',
            contentStyle: { backgroundColor: theme.appBackground },
          }}
        />
      </View>
      <BottomNav items={ALUNO_BOTTOM_NAV} accentColor={connectTheme.accent} />
      <NotificationsModal
        visible={notificationsOpen}
        notifications={notifications.notifications}
        loading={notifications.loading}
        error={notifications.error}
        pendingIds={notifications.pendingIds}
        markingAll={notifications.markingAll}
        onClose={() => setNotificationsOpen(false)}
        onMarkAsRead={notifications.markAsRead}
        onMarkAllAsRead={notifications.markAllAsRead}
      />
    </View>
  );
}
