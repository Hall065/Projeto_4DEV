import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ChatbotPortal } from '@/components/chatbot';
import { LoadingState } from '@/components/common/VisualPrimitives';
import { ConfirmDialogProvider } from '@/hooks/useConfirmDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/stores/app.store';
import { useAuthStore } from '@/stores/auth.store';
import { startStudentGeofence } from '@/tasks/geofenceTask';

export default function RootLayout() {
  const { hydrate, isInitialized, session } = useAuthStore();
  const { hydratePreferences, preferencesInitialized } = useAppStore();
  const theme = useThemeColors();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    hydratePreferences();
  }, [hydratePreferences]);

  useEffect(() => {
    startStudentGeofence(session).catch((error) => {
      console.warn('[Geofence] Nao foi possivel iniciar o monitoramento:', error);
    });
  }, [session]);

  if (!isInitialized || !preferencesInitialized) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.appBackground }}>
            <LoadingState label="Preparando o SENAI Hub..." />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ConfirmDialogProvider>
          <View style={{ flex: 1, position: 'relative' }}>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'fade_from_bottom',
                contentStyle: { backgroundColor: theme.appBackground },
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="recuperar-senha" />
              <Stack.Screen name="redefinir-senha" />
              <Stack.Screen name="hub" />
              <Stack.Screen name="connect" />
              <Stack.Screen name="grid" />
              <Stack.Screen name="safe" />
              <Stack.Screen name="aluno" />
              <Stack.Screen name="perfil" />
            </Stack>
            <ChatbotPortal />
          </View>
          <StatusBar style="light" />
        </ConfirmDialogProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
