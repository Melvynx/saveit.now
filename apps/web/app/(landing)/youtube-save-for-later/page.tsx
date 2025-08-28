import { LANDING_PAGES_CONFIG } from '@/lib/landing-pages/landing-page-config'
import { generateLandingPageMetadata } from '@/lib/landing-pages/seo-metadata'
import { DynamicLandingPage } from '@/features/marketing/dynamic-landing-page'
import { Metadata } from 'next'

const config = LANDING_PAGES_CONFIG['youtube-save-for-later']!

export const metadata: Metadata = generateLandingPageMetadata(config)

export default function YoutubeSaveForLaterPage() {
  return <DynamicLandingPage config={config} />
}

export const dynamic = 'force-static'