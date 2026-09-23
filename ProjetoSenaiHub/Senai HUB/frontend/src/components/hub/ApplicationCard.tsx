import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { HubApplication } from '../../types/application'
import { getAppBrandAssets } from '../../utils/appBrandAssets'
import { getApplicationCover } from '../../utils/applicationCovers'
import {
  PLATFORM_APP_CARD_CTA_CLASS,
  PlatformAppCard,
  PlatformAppCardCtaIcon,
} from './PlatformAppCard'

interface ApplicationCardProps {
  application: HubApplication
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const cover = getApplicationCover(application.slug)
  const brandName = getAppBrandAssets(application.slug)?.name ?? application.name
  const ctaLabel = t('appCard.openApp')

  return (
    <PlatformAppCard
      slug={application.slug}
      name={brandName}
      description={application.description}
      cover={cover}
      cta={
        <button
          type="button"
          onClick={() => navigate(application.route_path)}
          className={PLATFORM_APP_CARD_CTA_CLASS}
        >
          {ctaLabel}
          <PlatformAppCardCtaIcon />
        </button>
      }
    />
  )
}
