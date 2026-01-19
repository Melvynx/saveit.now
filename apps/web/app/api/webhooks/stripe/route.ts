import { AUTH_PLANS } from "@/lib/auth/stripe/auth-plans";
import { inngest } from "@/lib/inngest/client";
import { logger } from "@/lib/logger";
import { stripeClient } from "@/lib/stripe";
import { prisma } from "@workspace/database";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

export const maxDuration = 300;

const getPlanFromSubscription = (subscription: Stripe.Subscription) => {
  const planName = subscription.metadata.plan;
  if (!planName) return null;
  return AUTH_PLANS.find((p) => p.name === planName);
};

export const POST = async (req: NextRequest) => {
  const headerList = await headers();
  const body = await req.text();
  const stripeSignature = headerList.get("stripe-signature");

  let event: Stripe.Event | null = null;
  try {
    event = stripeClient.webhooks.constructEvent(
      body,
      stripeSignature ?? "",
      process.env.STRIPE_WEBHOOK_SECRET ?? "",
    );
  } catch (err: unknown) {
    logger.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid Stripe webhook signature", details: String(err) },
      { status: 400 },
    );
  }

  logger.info(`📥 Stripe webhook received: ${event.type}`, { id: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await checkoutSessionCompleted(event.data.object, req);
        break;
      case "customer.subscription.updated":
        await customerSubscriptionUpdated(event.data.object, req);
        break;
      case "customer.subscription.deleted":
        await customerSubscriptionDeleted(event.data.object, req);
        break;
      default:
        logger.debug(`Unhandled event type: ${event.type}`);
        break;
    }
  } catch (error) {
    logger.error(`Error handling webhook event ${event.type}:`, error);
    return NextResponse.json(
      { error: "Webhook handler failed", eventType: event.type },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
};

const checkoutSessionCompleted = async (
  sessionData: Stripe.Checkout.Session,
  req: NextRequest,
) => {
  const session = sessionData;

  logger.info("Processing checkout.session.completed", {
    sessionId: session.id,
    customer: session.customer,
    subscription: session.subscription,
    metadata: session.metadata,
  });

  if (!session.customer || !session.subscription) {
    logger.warn("Missing customer or subscription in checkout session");
    return;
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer.id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;

  // First try to find user by stripeCustomerId
  let user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  // Fallback: find user by userId in session metadata (for mobile app flow)
  if (!user && session.metadata?.userId) {
    logger.info(
      `User not found by customerId, trying userId from metadata: ${session.metadata.userId}`,
    );
    user = await prisma.user.findFirst({
      where: { id: session.metadata.userId },
    });

    // Link the new Stripe customer ID to the user
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
      logger.info(`Linked Stripe customer ${customerId} to user ${user.id}`);
    }
  }

  if (!user) {
    logger.error(
      `User not found for customer ID: ${customerId} or userId: ${session.metadata?.userId}`,
    );
    return;
  }

  const stripeSubscription =
    await stripeClient.subscriptions.retrieve(subscriptionId);
  const priceId = stripeSubscription.items.data[0]?.price.id;

  if (!priceId) {
    logger.error(`No price ID found for subscription: ${subscriptionId}`);
    return;
  }

  const plan = getPlanFromSubscription(stripeSubscription);
  if (!plan) {
    logger.error(
      `Plan not found in subscription metadata: ${subscriptionId}. Metadata: ${JSON.stringify(stripeSubscription.metadata)}`,
    );
    return;
  }

  const existingSubscription = await prisma.subscription.findFirst({
    where: { referenceId: user.id },
  });

  let dbSubscription;
  const subscriptionData = {
    plan: plan.name,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    status: stripeSubscription.status,
    periodStart: new Date(stripeSubscription.current_period_start * 1000),
    periodEnd: new Date(stripeSubscription.current_period_end * 1000),
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
  };

  if (existingSubscription) {
    dbSubscription = await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: subscriptionData,
    });
  } else {
    dbSubscription = await prisma.subscription.create({
      data: {
        id: `sub_${Date.now()}`,
        referenceId: user.id,
        ...subscriptionData,
      },
    });
  }

  if (plan.onSubscriptionComplete) {
    await plan.onSubscriptionComplete(dbSubscription, {
      req,
      userId: user.id,
      stripeCustomerId: customerId,
      subscriptionId: subscriptionId,
    });
  }

  logger.info(
    `✅ Subscription created/updated for user: ${user.id}, plan: ${plan.name}`,
  );
};

const customerSubscriptionUpdated = async (
  subscriptionData: Stripe.Subscription,
  req: NextRequest,
) => {
  const subscription = subscriptionData;

  logger.info("Processing customer.subscription.updated:", subscription.id);

  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!dbSubscription) {
    logger.error(`Subscription not found in database: ${subscription.id}`);
    return;
  }

  const previousPlan = dbSubscription.plan;
  const plan = getPlanFromSubscription(subscription);
  const planName = plan?.name ?? dbSubscription.plan;

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      plan: planName,
      status: subscription.status,
      periodStart: new Date(subscription.current_period_start * 1000),
      periodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  logger.info(
    `🔄 Subscription updated: ${subscription.id}, status: ${subscription.status}, plan: ${planName}`,
  );

  const isUpgrade = previousPlan === "free" && planName !== "free";
  if (isUpgrade) {
    const userId = dbSubscription.referenceId;
    const failedBookmarks = await prisma.bookmark.findMany({
      where: {
        userId,
        status: "ERROR",
        metadata: {
          path: ["error"],
          string_contains: "Limit exceeded",
        },
      },
      select: { id: true },
    });

    if (failedBookmarks.length > 0) {
      logger.info(
        `♻️ Retrying ${failedBookmarks.length} failed bookmarks for user ${userId} after upgrade`,
      );

      await prisma.bookmark.updateMany({
        where: {
          id: { in: failedBookmarks.map((b) => b.id) },
        },
        data: { status: "PENDING" },
      });

      await inngest.send(
        failedBookmarks.map((bookmark) => ({
          name: "bookmark/process" as const,
          data: {
            bookmarkId: bookmark.id,
            userId,
          },
        })),
      );
    }
  }
};

const customerSubscriptionDeleted = async (
  subscriptionData: Stripe.Subscription,
  req: NextRequest,
) => {
  const subscription = subscriptionData;

  logger.info("Processing customer.subscription.deleted:", subscription.id);

  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!dbSubscription) {
    logger.error(`Subscription not found in database: ${subscription.id}`);
    return;
  }

  const plan = getPlanFromSubscription(subscription);

  const updatedSubscription = await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      plan: "free",
      status: "canceled",
      cancelAtPeriodEnd: false,
      periodEnd: new Date(),
    },
  });

  if (plan?.onSubscriptionCanceled) {
    await plan.onSubscriptionCanceled(updatedSubscription, {
      req,
      userId: updatedSubscription.referenceId,
      stripeCustomerId: subscription.customer as string,
      subscriptionId: subscription.id,
    });
  }

  logger.info(
    `❌ Subscription canceled and reverted to free plan: ${subscription.id}`,
  );
};
