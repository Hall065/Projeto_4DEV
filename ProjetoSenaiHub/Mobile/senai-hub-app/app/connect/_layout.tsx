import { Stack, usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { SidebarDrawer } from '@/components/layout/SidebarDrawer';
import { NotificationsModal } from '@/components/notifications/NotificationsModal';
import { connectTheme } from '@/constants/colors';
import { getConnectBottomNav, getConnectDrawerItems } from '@/constants/navigation';
import { useThemeColors } from '@/hooks/useThemeColors';
import { canAccessConnect, canAccessConnectRoute, getDefaultConnectRoute, getPostLoginRoute } from '@/lib/permissions';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuthStore } from '@/stores/auth.store';

function isConnectPath(pathname: string) {
  return pathname === '/connect' || pathname.startsWith('/connect/');
}

export default function ConnectLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const session = useAuthStore((s) => s.session);
  const theme = useThemeColors();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifications = useNotifications(session?.userId);

  useEffect(() => {
    if (!session) {
      router.replace('/login');
      return;
    }
    if (session.perfil && !canAccessConnect(session.perfil, session.aplicacoes)) {
      router.replace(getPostLoginRoute(session) as never);
      return;
    }
    if (
      session.perfil &&
      isConnectPath(pathname) &&
      !canAccessConnectRoute(session.perfil.tipo, pathname)
    ) {
      router.replace(getDefaultConnectRoute(session.perfil.tipo) as never);
    }
  }, [pathname, session, router]);

  const drawerItems = getConnectDrawerItems(session?.perfil?.tipo).filter((item) =>
    canAccessConnectRoute(session?.perfil?.tipo, item.route)
  );
  const bottomItems = getConnectBottomNav(session?.perfil?.tipo).filter((item) =>
    canAccessConnectRoute(session?.perfil?.tipo, item.route)
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.appBackground }}>
      <AppHeader
        title="SENAI Connect"
        brandArea="connect"
        accentColor={connectTheme.accent}
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
      <BottomNav items={bottomItems} accentColor={connectTheme.accent} />
      <SidebarDrawer items={drawerItems} moduleTitle="SENAI Connect" accentColor={connectTheme.accent} />
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
