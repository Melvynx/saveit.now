import { LANDING_PAGES_CONFIG } from '@/lib/landing-pages/landing-page-config'
import { generateLandingPageMetadata } from '@/lib/landing-pages/seo-metadata'
import { DynamicLandingPage } from '@/features/marketing/dynamic-landing-page'
import { Metadata } from 'next'

const config = LANDING_PAGES_CONFIG['youtube-bookmark']!

export const metadata: Metadata = generateLandingPageMetadata(config)

export default function YoutubeBookmarkPage() {
  return <DynamicLandingPage config={config} />
}

export const dynamic = 'force-static'