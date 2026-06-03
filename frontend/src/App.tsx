import { Toaster } from 'sonner'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import AppRoutes from './routes'

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            },
          }}
        />
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
