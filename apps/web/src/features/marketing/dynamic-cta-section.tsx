import { Button } from '@workspace/ui/components/button'
import { Typography } from '@workspace/ui/components/typography'
import { Card, CardContent } from '@workspace/ui/components/card'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { LandingPageConfig } from '@/lib/landing-pages/landing-page-config'

export const DynamicCtaSection = ({
  config
}: {
  config: LandingPageConfig
}) => {
  return (
    <section className="bg-gradient-to-br from-primary/5 to-secondary/5 py-16">
      <div className="container mx-auto px-4">
        <Card className="mx-auto max-w-4xl border-0 bg-background/80 backdrop-blur-sm">
          <CardContent className="p-12 text-center">
            <Typography variant="h2" className="mb-4 text-3xl font-bold">
              Start Saving {config.hero.badge.replace(/[^\w\s]/g, '')} Today
            </Typography>
            
            <Typography variant="lead" className="mb-8 text-lg text-muted-foreground">
              Join thousands of users who never lose important content again
            </Typography>
            
            <div className="mb-8 flex flex-wrap justify-center gap-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-green-500" />
                <span>Free forever plan</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-green-500" />
                <span>Setup in 2 minutes</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/auth/signin">
                <Button size="lg" className="px-8 py-3 text-lg">
                  Get Started Free
                </Button>
              </Link>
              
              <Link href="/auth/signin">
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-3 text-lg"
                >
                  Sign in with Google
                </Button>
              </Link>
            </div>
            
            <Typography variant="small" className="mt-6 text-xs text-muted-foreground">
              Trusted by 50,000+ users worldwide
            </Typography>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}