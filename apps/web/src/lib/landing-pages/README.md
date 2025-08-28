# SEO Landing Page Builder System

## Overview

This system allows you to easily create SEO-optimized landing pages for SaveIt with consistent branding, structured data, and dynamic content. The system is built with Next.js, TypeScript, and includes automatic OpenGraph image generation.

## Quick Start

To create a new landing page:

1. Add your landing page configuration to `landing-page-config.ts`
2. Create a new route file in `app/(landing)/your-page-name/page.tsx`
3. That's it! The system handles SEO metadata, OpenGraph images, and structured data automatically.

## Architecture

```
src/lib/landing-pages/
├── landing-page-config.ts    # Configuration for all landing pages
├── seo-metadata.ts          # SEO metadata generation
└── README.md               # This documentation

src/features/marketing/
├── dynamic-landing-page.tsx      # Main landing page template
├── dynamic-landing-hero.tsx      # Hero section component
├── dynamic-benefits-section.tsx  # Benefits grid section
├── dynamic-use-cases-section.tsx # Use cases with steps
├── dynamic-faq-section.tsx       # FAQ accordion
└── dynamic-cta-section.tsx       # Call-to-action section

app/(landing)/
├── [slug]/page.tsx              # Dynamic route handler
├── twitter-bookmark/page.tsx    # Static route for Twitter bookmarking
├── youtube-bookmark/page.tsx    # Static route for YouTube bookmarking
├── save-image/page.tsx          # Static route for image saving
└── ...

app/api/og/route.tsx             # OpenGraph image generation API
```

## Adding a New Landing Page

### Step 1: Add Configuration

Edit `src/lib/landing-pages/landing-page-config.ts` and add your new landing page:

```typescript
export const LANDING_PAGES_CONFIG: Record<string, LandingPageConfig> = {
  // ... existing configs
  
  'your-new-page': {
    slug: 'your-new-page',
    title: 'Your SEO-Optimized Title - SaveIt',
    description: 'Your compelling meta description for search engines and social sharing.',
    keywords: [
      'your primary keyword',
      'secondary keyword',
      'long tail keyword phrase',
    ],
    
    hero: {
      badge: '🎯 Your Badge Text',
      headline: 'Your Compelling Headline',
      subHeadline: 'Your supporting subtitle that explains the value proposition.',
      videoUrl: 'https://www.tella.tv/video/your-demo-video',
      features: [
        { emoji: '⚡', text: 'Key feature 1' },
        { emoji: '🧠', text: 'Key feature 2' },
        { emoji: '🔍', text: 'Key feature 3' }
      ],
      trustIndicators: [
        { emoji: '✅', text: 'No credit card' },
        { emoji: '🛡️', text: '24/7 Support' },
        { emoji: '🆓', text: 'Free plan' }
      ]
    },
    
    benefits: [
      {
        emoji: '🎯',
        title: 'Benefit Title',
        description: 'Detailed explanation of how this benefits the user.'
      },
      // Add 4-6 benefits total
    ],
    
    useCases: [
      {
        title: 'Use Case Name',
        description: 'Brief description of this use case scenario.',
        steps: [
          'Step 1: What the user does first',
          'Step 2: What happens next',
          'Step 3: The final outcome'
        ]
      },
      // Add 2-3 use cases total
    ],
    
    faq: [
      {
        question: 'Common question users might have?',
        answer: 'Comprehensive answer that addresses the concern and builds confidence.'
      },
      // Add 4-6 FAQ items total
    ]
  }
}
```

### Step 2: Create Route File

Create `app/(landing)/your-new-page/page.tsx`:

```typescript
import { LANDING_PAGES_CONFIG } from '@/lib/landing-pages/landing-page-config'
import { generateLandingPageMetadata } from '@/lib/landing-pages/seo-metadata'
import { DynamicLandingPage } from '@/features/marketing/dynamic-landing-page'
import { Metadata } from 'next'

const config = LANDING_PAGES_CONFIG['your-new-page']!

export const metadata: Metadata = generateLandingPageMetadata(config)

export default function YourNewPage() {
  return <DynamicLandingPage config={config} />
}

export const dynamic = 'force-static'
```

### Step 3: Test and Deploy

```bash
# Build and test locally
pnpm build

# Your page will be available at:
# - /your-new-page (direct route)
# - Also accessible via the dynamic route /[slug]
```

## SEO Features

The system automatically provides:

### Meta Tags
- Title and description
- Keywords
- Author and publisher information
- Canonical URLs
- Robots directives

### OpenGraph
- Dynamically generated social media images
- Proper OpenGraph meta tags for Facebook, LinkedIn
- Twitter Card support with large images

### Structured Data (Schema.org)
- FAQPage markup for FAQ sections
- WebSite markup with search action
- Organization markup
- WebPage markup with software application details

### Performance
- Static generation (SSG) for optimal performance
- Automatic image optimization
- Minimal JavaScript bundles

## Content Guidelines

### Headlines
- Keep primary headlines under 60 characters
- Use action-oriented language
- Include target keywords naturally
- Focus on user benefits, not features

### Descriptions
- Meta descriptions should be 150-160 characters
- Include primary keyword in first 120 characters
- Add compelling call-to-action
- Avoid duplicate descriptions across pages

### Keywords
- Include 5-10 relevant keywords
- Mix short-tail and long-tail keywords
- Research competitor keywords
- Avoid keyword stuffing

### Benefits
- Focus on user outcomes, not product features
- Use emotional language
- Include social proof elements
- Address pain points directly

### FAQ
- Answer real questions from users/support
- Include keyword variations naturally
- Provide complete, helpful answers
- Address common objections

## Video Integration

Each landing page includes a hero video. To update videos:

1. Record your demo video
2. Upload to Tella.tv or similar service
3. Update the `videoUrl` in your config
4. The video will automatically embed in the hero section

## Customization

### Adding New Sections

To add custom sections to specific landing pages:

1. Create your section component in `src/features/marketing/`
2. Import and add it to `dynamic-landing-page.tsx`
3. Use conditional rendering based on config properties

### Custom Styling

The system uses:
- **Tailwind CSS** for styling
- **Workspace UI components** (@workspace/ui/components/*)
- **Typography system** with predefined variants
- **Consistent color scheme** from design system

### Advanced SEO

For advanced SEO needs:
- Add custom structured data in `seo-metadata.ts`
- Modify OpenGraph images in `app/api/og/route.tsx`
- Add custom meta tags in the route files

## Analytics and Tracking

The system supports:
- **PostHog** for analytics (already integrated)
- **Goal tracking** for CTA clicks
- **A/B testing** capabilities
- **Conversion tracking** for sign-ups

## Performance Optimization

- All pages are statically generated (SSG)
- Images are automatically optimized
- Minimal JavaScript runtime
- Optimized Core Web Vitals scores
- Progressive enhancement approach

## Troubleshooting

### Common Issues

**Build errors:**
```bash
# Regenerate Prisma client if needed
cd packages/database && pnpm db:generate

# Check TypeScript
pnpm ts

# Verify lint
pnpm lint
```

**Missing components:**
- Always use `@workspace/ui/components/*` for imports
- Check available components in `packages/ui/`

**SEO issues:**
- Validate structured data with Google's Rich Results Test
- Check OpenGraph with Facebook Debugger
- Test mobile-friendliness with Google's Mobile-Friendly Test

### Best Practices

1. **Content First:** Always write content before coding
2. **Mobile First:** Design for mobile, enhance for desktop  
3. **Performance:** Monitor Core Web Vitals
4. **A/B Testing:** Test different headlines and CTAs
5. **Analytics:** Track user behavior and conversion paths

## Examples

The system includes these example landing pages:

- `/twitter-bookmark` - Twitter content saving
- `/youtube-bookmark` - YouTube video bookmarking  
- `/save-image` - Image collection and organization
- `/twitter-saveit-for-later` - Read-later for Twitter
- `/youtube-save-for-later` - Watch-later for YouTube

Study these examples for content structure and keyword optimization patterns.