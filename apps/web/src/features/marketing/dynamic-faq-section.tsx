'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion'
import { Typography } from '@workspace/ui/components/typography'
import { LandingPageConfig } from '@/lib/landing-pages/landing-page-config'

export const DynamicFaqSection = ({
  config
}: {
  config: LandingPageConfig
}) => {
  return (
    <section className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <Typography variant="h2" className="mb-4 text-3xl font-bold">
            Frequently Asked Questions
          </Typography>
          <Typography variant="muted" className="text-lg">
            Everything you need to know about saving {config.hero.badge.replace(/[^\w\s]/g, '').toLowerCase()}
          </Typography>
        </div>
        
        <Accordion type="single" collapsible className="space-y-4">
          {config.faq.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="rounded-lg border bg-card px-6"
            >
              <AccordionTrigger className="text-left hover:no-underline">
                <Typography variant="h3" className="text-base font-medium">
                  {faq.question}
                </Typography>
              </AccordionTrigger>
              <AccordionContent>
                <Typography variant="muted" className="text-sm leading-relaxed">
                  {faq.answer}
                </Typography>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}