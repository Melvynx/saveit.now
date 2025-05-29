import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import { Typography } from "@workspace/ui/components/typography";
import { MaxWidthContainer } from "../page/page";

export const FAQ = () => {
  return (
    <MaxWidthContainer className="py-16 flex flex-col gap-8">
      <div className="text-center">
        <Typography variant="h2">Frequently Asked Questions</Typography>
      </div>

      <div className="max-w-3xl mx-auto w-full">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="cancel">
            <AccordionTrigger>
              <Typography variant="large">Can I cancel any time?</Typography>
            </AccordionTrigger>
            <AccordionContent>
              <Typography>
                Yes, you can cancel and we will send you a reminder before each
                payment.
              </Typography>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="limit">
            <AccordionTrigger>
              <Typography variant="large">Do I have a limit?</Typography>
            </AccordionTrigger>
            <AccordionContent>
              <Typography>
                There is no limit, but there is a fair usage policy that's
                really hard to reach. To avoid system outage, we rate limit the
                number of links saved at the same time using your account and
                the monthly link count.
              </Typography>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="upgrade">
            <AccordionTrigger>
              <Typography variant="large">How to upgrade my plan?</Typography>
            </AccordionTrigger>
            <AccordionContent>
              <Typography>
                Just go to the pricing page and upgrade your plan.
              </Typography>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="refund">
            <AccordionTrigger>
              <Typography variant="large">Do you offer refunds?</Typography>
            </AccordionTrigger>
            <AccordionContent>
              <Typography>
                Yes, we offer a 7-day refund guarantee. Just contact
                hi@saveit.now and get an instant refund. No questions asked.
              </Typography>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </MaxWidthContainer>
  );
};
