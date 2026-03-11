import Stripe from "stripe"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ""

// In production, avoid noisy console warnings

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-06-20",
  typescript: true,
})


