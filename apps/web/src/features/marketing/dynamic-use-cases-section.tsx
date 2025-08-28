import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Typography } from '@workspace/ui/components/typography'
import { Badge } from '@workspace/ui/components/badge'
import { LandingPageConfig } from '@/lib/landing-pages/landing-page-config'

export const DynamicUseCasesSection = ({
  config
}: {
  config: LandingPageConfig
}) => {
  return (
    <section className="bg-muted/30 py-16">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <Typography variant="h2" className="mb-4 text-3xl font-bold">
            Common Use Cases
          </Typography>
          <Typography variant="muted" className="text-lg">
            How people are using SaveIt to transform their content workflow
          </Typography>
        </div>
        
        <div className="grid gap-8 lg:grid-cols-3">
          {config.useCases.map((useCase, index) => (
            <Card key={index} className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {index + 1}
                  </Badge>
                  {useCase.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Typography variant="muted" className="mb-4 text-sm">
                  {useCase.description}
                </Typography>
                
                <div className="space-y-2">
                  {useCase.steps.map((step, stepIndex) => (
                    <div key={stepIndex} className="flex gap-3">
                      <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-white">
                        {stepIndex + 1}
                      </div>
                      <Typography variant="small" className="text-sm">
                        {step}
                      </Typography>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}