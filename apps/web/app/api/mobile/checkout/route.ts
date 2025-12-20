import { userRoute } from "@/lib/safe-route";
import { stripeClient } from "@/lib/stripe";
import { prisma } from "@workspace/database";
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

    const dbUser = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { stripeCustomerId: true },
    });

    const session = await stripeClient.checkout.sessions.create({
      customer: dbUser?.stripeCustomerId ?? undefined,
      customer_email: dbUser?.stripeCustomerId ? undefined : ctx.user.email,
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
        plan: "pro",
      },
      subscription_data: {
        metadata: {
          userId: ctx.user.id,
          plan: "pro",
        },
      },
    });

    return {
      checkoutUrl: session.url,
    };
  });
