import { I18nextProvider } from 'react-i18next'
import i18n from './i18n'
import { BrowserRouter } from 'react-router-dom'
import { AppearanceProvider } from './contexts/AppearanceContext'
import { AuthProvider } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { GlobalSearchProvider } from './contexts/GlobalSearchContext'
import { GlobalSearchPalette } from './components/search/GlobalSearchPalette'
import { ToastProvider } from './contexts/ToastContext'
import { ConfirmProvider } from './contexts/ConfirmContext'
import { SupportChatProvider } from './contexts/SupportChatContext'
import { SupportChatWidget } from './components/support/SupportChatWidget'
import { BootGate } from './components/fx/BootGate'
import { AppRoutes } from './routes'

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <ToastProvider>
          <ConfirmProvider>
          <AuthProvider>
            <SupportChatProvider>
            <NotificationProvider>
              <GlobalSearchProvider>
                <AppearanceProvider>
                  <BootGate>
                    <AppRoutes />
                    <GlobalSearchPalette />
                    <SupportChatWidget />
                  </BootGate>
                </AppearanceProvider>
              </GlobalSearchProvider>
            </NotificationProvider>
            </SupportChatProvider>
          </AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </BrowserRouter>
    </I18nextProvider>
  )
}

export default App
