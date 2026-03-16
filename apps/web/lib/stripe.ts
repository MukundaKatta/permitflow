import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    permits: 3,
    features: ["3 permit tracking", "Basic checklist", "Email reminders"],
  },
  starter: {
    name: "Starter",
    priceId: process.env.STRIPE_STARTER_PRICE_ID || "",
    price: 29,
    permits: 10,
    features: [
      "10 permit tracking",
      "AI checklist generation",
      "Auto-fill forms",
      "Email + push reminders",
      "Chat advisor (50 messages/mo)",
    ],
  },
  professional: {
    name: "Professional",
    priceId: process.env.STRIPE_PRO_PRICE_ID || "",
    price: 79,
    permits: -1, // unlimited
    features: [
      "Unlimited permit tracking",
      "AI checklist generation",
      "Auto-fill forms",
      "Priority reminders",
      "Unlimited chat advisor",
      "Document storage",
      "Regulation change alerts",
    ],
  },
  enterprise: {
    name: "Enterprise",
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || "",
    price: 199,
    permits: -1,
    features: [
      "Everything in Professional",
      "Multiple business profiles",
      "API access",
      "Dedicated support",
      "Custom integrations",
    ],
  },
} as const;
