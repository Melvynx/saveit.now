import { LANDING_PAGES_CONFIG } from '@/lib/landing-pages/landing-page-config'
import { generateOGImage, runtime, alt, size, contentType } from '@/lib/landing-pages/og-image-generator'

const config = LANDING_PAGES_CONFIG['save-image']!

export { runtime, alt, size, contentType }

export default async function Image() {
  return generateOGImage(config)
}