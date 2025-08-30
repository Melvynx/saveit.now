import { LANDING_PAGES_CONFIG } from '@/lib/landing-pages/landing-page-config'
import { generateOGImage, runtime, alt, size, contentType } from '@/lib/landing-pages/og-image-generator'

export { runtime, alt, size, contentType }

export default async function Image({ params }: { params: { slug: string } }) {
  const config = LANDING_PAGES_CONFIG[params.slug]
  
  if (!config) {
    // Fallback for unknown slugs
    return generateOGImage({
      slug: params.slug,
      title: 'SaveIt - Never Lose Important Content Again',
      description: 'Organize nothing. Find everything. The smartest way to save and find your digital content.',
      keywords: ['save content', 'bookmark manager', 'saveit'],
      hero: {
        badge: '📚 SaveIt',
        headline: 'Never Lose Important Content Again',
        subHeadline: 'Organize nothing. Find everything. The smartest way to save and find your digital content.',
        videoUrl: '',
        features: [],
        trustIndicators: []
      },
      keyFeatures: [],
      benefits: [],
      useCases: [],
      faq: []
    })
  }
  
  return generateOGImage(config)
}