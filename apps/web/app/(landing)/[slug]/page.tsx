import { notFound } from 'next/navigation'
import { LANDING_PAGES_CONFIG } from '@/lib/landing-pages/landing-page-config'
import { generateLandingPageMetadata } from '@/lib/landing-pages/seo-metadata'
import { DynamicLandingPage } from '@/features/marketing/dynamic-landing-page'
import { Metadata } from 'next'

interface LandingPageProps {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: LandingPageProps): Promise<Metadata> {
  const config = LANDING_PAGES_CONFIG[params.slug]
  
  if (!config) {
    return {}
  }
  
  return generateLandingPageMetadata(config)
}

export async function generateStaticParams() {
  return Object.keys(LANDING_PAGES_CONFIG).map((slug) => ({
    slug,
  }))
}

export default function LandingPage({ params }: LandingPageProps) {
  const config = LANDING_PAGES_CONFIG[params.slug]
  
  if (!config) {
    notFound()
  }
  
  return <DynamicLandingPage config={config} />
}

export const dynamic = 'force-static'