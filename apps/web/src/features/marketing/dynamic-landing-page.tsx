import { LandingPageConfig } from '@/lib/landing-pages/landing-page-config'
import { DynamicLandingHero } from './dynamic-landing-hero'
import { DynamicBenefitsSection } from './dynamic-benefits-section'
import { DynamicUseCasesSection } from './dynamic-use-cases-section'
import { DynamicFaqSection } from './dynamic-faq-section'
import { DynamicCtaSection } from './dynamic-cta-section'
import { ExtensionsSection } from './extensions-section'
import { LandingPricing } from './landing-pricing'
import { generateStructuredData } from '@/lib/landing-pages/seo-metadata'

export const DynamicLandingPage = ({
  config
}: {
  config: LandingPageConfig
}) => {
  const structuredData = generateStructuredData(config)
  
  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData.webpage),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData.faq),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData.organization),
        }}
      />
      
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <DynamicLandingHero config={config} />
        
        {/* Benefits Section */}
        <DynamicBenefitsSection config={config} />
        
        {/* Use Cases Section */}
        <DynamicUseCasesSection config={config} />
        
        {/* Extensions Section - Reuse existing component */}
        <ExtensionsSection />
        
        {/* Pricing Section - Reuse existing component */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">Simple, Transparent Pricing</h2>
              <p className="text-lg text-muted-foreground">
                Start free, upgrade when you need more
              </p>
            </div>
            <LandingPricing />
          </div>
        </section>
        
        {/* FAQ Section */}
        <DynamicFaqSection config={config} />
        
        {/* CTA Section */}
        <DynamicCtaSection config={config} />
      </div>
    </>
  )
}