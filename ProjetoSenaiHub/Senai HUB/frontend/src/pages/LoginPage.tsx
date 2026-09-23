import { type FormEvent, useState } from 'react'
import { Lock, Mail } from 'lucide-react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthButton } from '../components/auth/AuthButton'
import { AuthField } from '../components/auth/AuthField'
import { AuthFormCard } from '../components/auth/AuthFormCard'
import { PasswordToggle } from '../components/auth/PasswordToggle'
import { useAuth } from '../contexts/AuthContext'
import { FadeIn, HoverLift, MotionItem, StaggerChildren } from '../motion'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, isAuthenticated, isSubmitting, isInitializing } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sessionExpired = searchParams.get('expired') === '1'

  if (isAuthenticated) {
    return <Navigate to="/hub" replace />
  }

  if (isInitializing) {
    return null
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    try {
      await login({ email, password })
      navigate('/hub')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.invalidCredentials'))
    }
  }

  return (
    <FadeIn delay={0.04} y={14}>
      <AuthFormCard
        title={t('auth.loginTitle')}
        subtitle={t('auth.loginSubtitle')}
        footer={
          <p className="text-hub-text-muted text-sm">
            {t('auth.adminOnlySignup')}{' '}
            <Link to="/solicitar-acesso" className="font-medium text-hub-red hover:underline">
              {t('auth.requestAccess')}
            </Link>
          </p>
        }
      >
        <form onSubmit={handleSubmit}>
          <StaggerChildren stagger={0.055} delay={0.1} className="space-y-5">
            {sessionExpired && (
              <MotionItem>
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {t('auth.sessionExpired')}
                </p>
              </MotionItem>
            )}

            <MotionItem>
              <AuthField
                label={t('auth.email')}
                type="email"
                icon={Mail}
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </MotionItem>

            <MotionItem>
              <AuthField
                label={t('auth.password')}
                type={showPassword ? 'text' : 'password'}
                icon={Lock}
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                rightSlot={
                  <PasswordToggle
                    visible={showPassword}
                    onToggle={() => setShowPassword((visible) => !visible)}
                    labelShow={t('auth.showPassword')}
                    labelHide={t('auth.hidePassword')}
                  />
                }
              />
            </MotionItem>

            <MotionItem>
              <div className="flex justify-end">
                <Link to="/recuperar-senha" className="text-sm font-medium text-hub-red-link hover:underline">
                  {t('auth.forgotPassword')}
                </Link>
              </div>
            </MotionItem>

            {error && (
              <MotionItem>
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              </MotionItem>
            )}

            <MotionItem>
              <HoverLift>
                <AuthButton isLoading={isSubmitting}>{t('auth.login')}</AuthButton>
              </HoverLift>
            </MotionItem>
          </StaggerChildren>
        </form>
      </AuthFormCard>
    </FadeIn>
  )
}
