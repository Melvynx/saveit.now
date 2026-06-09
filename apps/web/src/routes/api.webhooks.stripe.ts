import { AUTH_PLANS } from "@/lib/auth/stripe/auth-plans";
import { inngest } from "@/lib/inngest/client";
import { logger } from "@/lib/logger";
import { stripeClient } from "@/lib/stripe";
import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@workspace/database/client";
import type Stripe from "stripe";

const getPlanFromSubscription = (subscription: Stripe.Subscription) => {
  const planName = subscription.metadata.plan;
  if (!planName) return null;
  return AUTH_PLANS.find((plan) => plan.name === planName);
};

const checkoutSessionCompleted = async (
  sessionData: Stripe.Checkout.Session,
  request: Request,
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

  let user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user && session.metadata?.userId) {
    logger.info(
      `User not found by customerId, trying userId from metadata: ${session.metadata.userId}`,
    );
    user = await prisma.user.findFirst({
      where: { id: session.metadata.userId },
    });

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

  const subscriptionData = {
    plan: plan.name,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    status: stripeSubscription.status,
    periodStart: new Date(stripeSubscription.current_period_start * 1000),
    periodEnd: new Date(stripeSubscription.current_period_end * 1000),
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
  };

  const dbSubscription = existingSubscription
    ? await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: subscriptionData,
      })
    : await prisma.subscription.create({
        data: {
          id: `sub_${Date.now()}`,
          referenceId: user.id,
          ...subscriptionData,
        },
      });

  if (plan.onSubscriptionComplete) {
    await plan.onSubscriptionComplete(dbSubscription, {
      req: request,
      userId: user.id,
      stripeCustomerId: customerId,
      subscriptionId,
    });
  }

  logger.info(
    `Subscription created/updated for user: ${user.id}, plan: ${plan.name}`,
  );
};

const customerSubscriptionUpdated = async (
  subscriptionData: Stripe.Subscription,
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
    `Subscription updated: ${subscription.id}, status: ${subscription.status}, plan: ${planName}`,
  );

  const isUpgrade = previousPlan === "free" && planName !== "free";
  if (!isUpgrade) return;

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

  if (failedBookmarks.length === 0) return;

  logger.info(
    `Retrying ${failedBookmarks.length} failed bookmarks for user ${userId} after upgrade`,
  );

  await prisma.bookmark.updateMany({
    where: { id: { in: failedBookmarks.map((bookmark) => bookmark.id) } },
    data: { status: "PENDING" },
  });

  await inngest.send(
    failedBookmarks.map((bookmark) => ({
      name: "bookmark/process" as const,
      data: { bookmarkId: bookmark.id, userId },
    })),
  );
};

const customerSubscriptionDeleted = async (
  subscriptionData: Stripe.Subscription,
  request: Request,
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
      req: request,
      userId: updatedSubscription.referenceId,
      stripeCustomerId: subscription.customer as string,
      subscriptionId: subscription.id,
    });
  }

  logger.info(
    `Subscription canceled and reverted to free plan: ${subscription.id}`,
  );
};

const POST = async ({ request }: { request: Request }) => {
  const body = await request.text();
  const stripeSignature = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripeClient.webhooks.constructEvent(
      body,
      stripeSignature ?? "",
      process.env.STRIPE_WEBHOOK_SECRET ?? "",
    );
  } catch (error: unknown) {
    logger.error("Stripe webhook signature verification failed:", error);
    return Response.json(
      { error: "Invalid Stripe webhook signature", details: String(error) },
      { status: 400 },
    );
  }

  logger.info(`Stripe webhook received: ${event.type}`, { id: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await checkoutSessionCompleted(event.data.object, request);
        break;
      case "customer.subscription.updated":
        await customerSubscriptionUpdated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await customerSubscriptionDeleted(event.data.object, request);
        break;
      default:
        logger.debug(`Unhandled event type: ${event.type}`);
        break;
    }
  } catch (error) {
    logger.error(`Error handling webhook event ${event.type}:`, error);
    return Response.json(
      { error: "Webhook handler failed", eventType: event.type },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
};

export const Route = createFileRoute("/api/webhooks/stripe")({
  server: { handlers: { POST } },
});
