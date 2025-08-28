import { LANDING_PAGES_CONFIG } from '@/lib/landing-pages/landing-page-config'
import { generateOGImage } from '@/lib/landing-pages/og-image-generator'

const config = LANDING_PAGES_CONFIG['twitter-bookmark']!

export const runtime = 'edge'
export const alt = 'SaveIt - Twitter Bookmark Tool'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return generateOGImage(config)
}