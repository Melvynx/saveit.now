import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Typography } from '@workspace/ui/components/typography'
import { Check } from 'lucide-react'
import Link from 'next/link'
import { LandingPageConfig } from '@/lib/landing-pages/landing-page-config'

export const DynamicLandingHero = ({
  config
}: {
  config: LandingPageConfig
}) => {
  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10 mx-auto h-full max-w-7xl bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-orange-400 opacity-20 blur-[100px]" />
      
      <div className="container mx-auto px-4 py-16 sm:py-24">
        <div className="flex flex-col items-center text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm">
            {config.hero.badge}
          </Badge>
          
          <Typography
            variant="h1"
            className="mb-6 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
          >
            {config.hero.headline}
          </Typography>
          
          <Typography
            variant="lead"
            className="mb-8 max-w-3xl text-lg text-muted-foreground sm:text-xl"
          >
            {config.hero.subHeadline}
          </Typography>
          
          <div className="mb-8 flex flex-wrap justify-center gap-6">
            {config.hero.trustIndicators.map((indicator, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-green-500" />
                <span>{indicator.text}</span>
              </div>
            ))}
          </div>
          
          <div className="mb-12 flex flex-col items-center gap-4 sm:flex-row">
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
          
          <div className="mb-16 max-w-4xl">
            <div
              className="relative mx-auto aspect-video rounded-lg shadow-2xl"
              style={{
                background:
                  'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 50%, hsl(var(--secondary)) 100%)',
              }}
            >
              <div className="absolute inset-4 rounded-md bg-background">
                <iframe
                  src={config.hero.videoUrl}
                  className="h-full w-full rounded-md"
                  allow="fullscreen"
                  title={`${config.title} Demo Video`}
                />
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <div className="flex flex-wrap justify-center gap-6">
              {config.hero.features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-full bg-muted px-4 py-2"
                >
                  <span className="text-xl">{feature.emoji}</span>
                  <span className="text-sm font-medium">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-8 text-sm text-muted-foreground">
            <Link
              href="/extensions"
              className="flex items-center gap-2 hover:text-foreground"
            >
              <div className="h-6 w-6 rounded bg-[#4285f4]" />
              Chrome
            </Link>
            
            <Link
              href="/extensions"
              className="flex items-center gap-2 hover:text-foreground"
            >
              <div className="h-6 w-6 rounded bg-[#ff7139]" />
              Firefox
            </Link>
            
            <Link
              href="/ios"
              className="flex items-center gap-2 hover:text-foreground"
            >
              <div className="h-6 w-6 rounded bg-[#007aff]" />
              iOS App
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}