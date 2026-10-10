import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { updateUserMembershipTier, type PLAN_LIMITS } from "@/lib/credits";
import { sql, type MembershipTier } from "@/lib/db";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!stripe || !WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 400 }
    );
  }

  const payload = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.userId;
        const tier = (session.metadata?.tier || "pro") as MembershipTier;

        if (userId) {
          await updateUserMembershipTier(userId, tier, {
            stripeCustomerId: String(session.customer || ""),
            stripeSubscriptionId: String(session.subscription || ""),
            subscriptionStatus: "active",
          });
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const status = sub.status === "active" ? "active" : "canceled";
        const customerId = String(sub.customer);

        await sql()`
          UPDATE users
          SET subscription_status = ${status},
              membership_tier = CASE WHEN ${status} = 'canceled' THEN 'free' ELSE membership_tier END
          WHERE stripe_customer_id = ${customerId}
        `;
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = String(invoice.customer);

        // On recurring renewal invoice, refill monthly credits
        const user = (await sql()`
          SELECT id, membership_tier FROM users WHERE stripe_customer_id = ${customerId} LIMIT 1
        `) as { id: string; membership_tier: MembershipTier }[];

        if (user[0]) {
          await updateUserMembershipTier(user[0].id, user[0].membership_tier, {
            subscriptionStatus: "active",
          });
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Error processing Stripe webhook:", err);
    return NextResponse.json(
      { error: "Webhook handler failed." },
      { status: 500 }
    );
  }
}
