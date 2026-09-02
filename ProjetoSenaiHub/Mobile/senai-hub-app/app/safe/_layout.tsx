import { Stack, usePathname, useRouter } from 'expo-router';
import { ClipboardList, DoorOpen, LayoutDashboard, UserCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { BottomNav, type NavItem } from '@/components/layout/BottomNav';
import { AppHeader } from '@/components/layout/AppHeader';
import { SidebarDrawer } from '@/components/layout/SidebarDrawer';
import { NotificationsModal } from '@/components/notifications/NotificationsModal';
import { colors } from '@/constants/colors';
import { SAFE_DRAWER_ITEMS } from '@/constants/navigation';
import { ROUTES } from '@/constants/routes';
import { useNotifications } from '@/hooks/useNotifications';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  canAccessSafe,
  canAccessSafeRoute,
  getDefaultSafeRoute,
  getPostLoginRoute,
} from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth.store';

function isSafePath(pathname: string) {
  return pathname === ROUTES.safe.root || pathname.startsWith(ROUTES.safe.root + '/');
}

export default function SafeLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const session = useAuthStore((state) => state.session);
  const theme = useThemeColors();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifications = useNotifications(session?.userId);
  const role = session?.perfil?.tipo;

  useEffect(() => {
    if (!session) {
      router.replace(ROUTES.login);
      return;
    }
    if (session.perfil && !canAccessSafe(session.perfil, session.aplicacoes)) {
      router.replace(getPostLoginRoute(session) as never);
      return;
    }
    if (session.perfil && isSafePath(pathname) && !canAccessSafeRoute(session.perfil.tipo, pathname)) {
      router.replace(getDefaultSafeRoute(session.perfil.tipo) as never);
    }
  }, [pathname, router, session]);

  const items: NavItem[] = [
    { label: 'Resumo', route: ROUTES.safe.index, icon: <LayoutDashboard /> },
    { label: 'Autorizacoes', route: ROUTES.safe.autorizacoes, icon: <ClipboardList /> },
    { label: 'Aprovacoes', route: ROUTES.safe.aprovacoes, icon: <UserCheck /> },
    { label: 'Portaria', route: ROUTES.safe.portaria, icon: <DoorOpen /> },
  ].filter((item) => canAccessSafeRoute(role, item.route));
  const drawerItems = SAFE_DRAWER_ITEMS.filter((item) => canAccessSafeRoute(role, item.route));

  return (
    <View style={{ flex: 1, backgroundColor: theme.appBackground }}>
      <AppHeader
        title="SENAI Safe"
        brandArea="safe"
        subtitle="Controle seguro de entradas e saidas"
        accentColor={colors.red}
        notificationCount={notifications.unreadCount}
        onNotificationsPress={() => setNotificationsOpen(true)}
      />
      <View style={{ flex: 1, backgroundColor: theme.appBackground }}>
        <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom', contentStyle: { backgroundColor: theme.appBackground } }} />
      </View>
      <BottomNav items={items} accentColor={colors.red} />
      <SidebarDrawer items={drawerItems} moduleTitle="SENAI Safe" accentColor={colors.purple} />
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
