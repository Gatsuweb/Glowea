import { stripe } from "./stripe";
import type Stripe from "stripe";

export function getAppUrl(requestUrl: string) {
  return (process.env.NEXT_PUBLIC_APP_URL || new URL(requestUrl).origin).replace(/\/$/, "");
}

export async function getPortalConfigurationId() {
  if (process.env.STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID) {
    try {
      const configuration = await stripe.billingPortal.configurations.retrieve(
        process.env.STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID
      );

      if (configuration.active) return configuration.id;
    } catch (error) {
      console.warn("Stripe customer portal configuration not found, falling back to Glowea default:", error);
    }
  }

  const configurations = await stripe.billingPortal.configurations.list({
    active: true,
    limit: 100,
  });
  const existing = configurations.data.find((configuration) => configuration.name === "Glowea abonnement");

  if (existing) return existing.id;

  const configuration = await stripe.billingPortal.configurations.create({
    name: "Glowea abonnement",
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        proration_behavior: "none",
        cancellation_reason: {
          enabled: true,
          options: ["too_expensive", "missing_features", "unused", "other"],
        },
      },
      subscription_update: {
        enabled: false,
      },
    },
  });

  return configuration.id;
}

export async function createCustomerPortalSession(params: {
  customerId: string;
  returnUrl: string;
  flowData?: Stripe.BillingPortal.SessionCreateParams.FlowData;
}) {
  const configuration = await getPortalConfigurationId();

  return stripe.billingPortal.sessions.create({
    customer: params.customerId,
    configuration,
    flow_data: params.flowData,
    locale: "fr",
    return_url: params.returnUrl,
  });
}

export async function findCurrentCustomerSubscriptions(customerId: string) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  });

  return subscriptions.data.filter((subscription) =>
    ["active", "trialing", "past_due", "unpaid", "paused"].includes(subscription.status)
  );
}
