import Stripe from "stripe";
import { appConfig } from "./config";

let cached: Stripe | null = null;

export function getStripe() {
  if (cached) return cached;
  if (!appConfig.stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY manquant.");
  }
  cached = new Stripe(appConfig.stripeSecretKey, {
    apiVersion: "2026-01-28.clover",
  });
  return cached;
}
