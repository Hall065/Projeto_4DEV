import { useTranslation } from 'react-i18next'
import { MotionPageLoader } from '../fx/MotionPageLoader'

export function PageLoader({ label }: { label?: string }) {
  const { t } = useTranslation()
  const displayLabel = label ?? t('common.loading')

  return <MotionPageLoader label={displayLabel} />
}

export function AppBootSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-hub-bg">
      <div className="h-14 animate-pulse bg-hub-navy/10" />
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 p-6">
        <div className="hidden w-56 shrink-0 animate-pulse rounded-2xl bg-hub-navy/10 lg:block" />
        <div className="flex flex-1 flex-col gap-4">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-white/60" />
          <div className="h-48 animate-pulse rounded-2xl bg-white/60" />
          <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
            <div className="h-36 animate-pulse rounded-2xl bg-white/60" />
            <div className="h-36 animate-pulse rounded-2xl bg-white/60" />
          </div>
        </div>
      </div>
    </div>
  )
}
