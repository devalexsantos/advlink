import Stripe from "stripe"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ""

if (!stripeSecretKey) {
  // Do not throw at import time to avoid crashing non-stripe pages
  console.warn("[stripe] Missing STRIPE_SECRET_KEY env var")
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-06-20",
  typescript: true,
})


