import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@permitflow/supabase";
import type { SubscriptionTier } from "@permitflow/supabase";
import Stripe from "stripe";

const PRICE_TO_TIER: Record<string, SubscriptionTier> = {
  [process.env.STRIPE_STARTER_PRICE_ID || ""]: "starter",
  [process.env.STRIPE_PRO_PRICE_ID || ""]: "professional",
  [process.env.STRIPE_ENTERPRISE_PRICE_ID || ""]: "enterprise",
};

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", (err as Error).message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      // Update organization with Stripe info
      await supabase
        .from("organizations")
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        })
        .eq("stripe_customer_id", customerId);

      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const priceId = subscription.items.data[0]?.price?.id;

      const tier = priceId ? PRICE_TO_TIER[priceId] || "free" : "free";

      await supabase
        .from("organizations")
        .update({
          subscription_tier: tier,
          stripe_subscription_id: subscription.id,
        })
        .eq("stripe_customer_id", customerId);

      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      await supabase
        .from("organizations")
        .update({
          subscription_tier: "free",
          stripe_subscription_id: null,
        })
        .eq("stripe_customer_id", customerId);

      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      // Could send a notification to the user here
      console.warn(`Payment failed for customer: ${customerId}`);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
