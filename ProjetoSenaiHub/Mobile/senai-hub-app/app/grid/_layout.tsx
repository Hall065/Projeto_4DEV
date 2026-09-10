import { Stack, usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { SidebarDrawer } from '@/components/layout/SidebarDrawer';
import { NotificationsModal } from '@/components/notifications/NotificationsModal';
import { gridTheme } from '@/constants/colors';
import { GRID_BOTTOM_NAV, GRID_DRAWER_ITEMS } from '@/constants/navigation';
import { useThemeColors } from '@/hooks/useThemeColors';
import { canAccessGrid, canAccessGridRoute, getDefaultGridRoute, getPostLoginRoute } from '@/lib/permissions';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuthStore } from '@/stores/auth.store';

function isGridPath(pathname: string) {
  return pathname === '/grid' || pathname.startsWith('/grid/');
}

export default function GridLayout() {
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
    if (session.perfil && !canAccessGrid(session.perfil, session.aplicacoes)) {
      router.replace(getPostLoginRoute(session) as never);
      return;
    }
    if (session.perfil && isGridPath(pathname) && !canAccessGridRoute(session.perfil.tipo, pathname)) {
      router.replace(getDefaultGridRoute(session.perfil.tipo) as never);
    }
  }, [pathname, session, router]);

  const drawerItems = GRID_DRAWER_ITEMS.filter((item) =>
    canAccessGridRoute(session?.perfil?.tipo, item.route)
  );
  const bottomItems = GRID_BOTTOM_NAV.filter((item) =>
    canAccessGridRoute(session?.perfil?.tipo, item.route)
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.appBackground }}>
      <AppHeader
        title="SENAI Grid"
        brandArea="grid"
        accentColor={gridTheme.accent}
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
      <BottomNav items={bottomItems} accentColor={gridTheme.accent} />
      <SidebarDrawer items={drawerItems} moduleTitle="SENAI Grid" accentColor={gridTheme.accent} />
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
