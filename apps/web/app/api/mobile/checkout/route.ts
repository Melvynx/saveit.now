import { userRoute } from "@/lib/safe-route";
import { stripeClient } from "@/lib/stripe";
import { z } from "zod";

export const POST = userRoute
  .body(
    z.object({
      annual: z.boolean().optional().default(false),
      successUrl: z.string(),
      cancelUrl: z.string(),
    }),
  )
  .handler(async (req, { body, ctx }) => {
    const priceId = body.annual
      ? process.env.STRIPE_PRO_YEARLY_PRICE_ID!
      : process.env.STRIPE_PRO_MONTHLY_PRICE_ID!;

    const session = await stripeClient.checkout.sessions.create({
      customer: ctx.user.stripeCustomerId ?? undefined,
      customer_email: ctx.user.stripeCustomerId ? undefined : ctx.user.email,
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: body.successUrl,
      cancel_url: body.cancelUrl,
      allow_promotion_codes: true,
      metadata: {
        userId: ctx.user.id,
      },
      subscription_data: {
        metadata: {
          userId: ctx.user.id,
        },
      },
    });

    return {
      checkoutUrl: session.url,
    };
  });
