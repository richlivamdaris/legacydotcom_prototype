import Stripe from "stripe";
import { env } from "../env.js";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  typescript: true,
  appInfo: {
    name: "memoriams-portal-prototype",
    version: "0.0.1",
  },
});
