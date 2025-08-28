import { Card, CardContent } from '@workspace/ui/components/card'
import { Typography } from '@workspace/ui/components/typography'
import { LandingPageConfig } from '@/lib/landing-pages/landing-page-config'

export const DynamicBenefitsSection = ({
  config
}: {
  config: LandingPageConfig
}) => {
  return (
    <section className="container mx-auto px-4 py-16">
      <div className="mb-12 text-center">
        <Typography variant="h2" className="mb-4 text-3xl font-bold">
          Why Choose SaveIt for {config.hero.badge.replace(/[^\w\s]/g, '')}?
        </Typography>
        <Typography variant="muted" className="text-lg">
          Everything you need to organize and find your content
        </Typography>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {config.benefits.map((benefit, index) => (
          <Card key={index} className="border-0 bg-muted/50">
            <CardContent className="p-6 text-center">
              <div className="mb-4 text-4xl">{benefit.emoji}</div>
              <Typography variant="h3" className="mb-2 text-lg font-semibold">
                {benefit.title}
              </Typography>
              <Typography variant="muted" className="text-sm">
                {benefit.description}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}