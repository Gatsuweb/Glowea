import { stripe } from "./stripe";
import type Stripe from "stripe";

export function getAppUrl(requestUrl: string) {
  return (process.env.NEXT_PUBLIC_APP_URL || new URL(requestUrl).origin).replace(/\/$/, "");
}

function getSubscriptionPriceIds() {
  return [
    process.env.STRIPE_PRICE_ESSENTIAL,
    process.env.STRIPE_PRICE_STARTER,
    process.env.STRIPE_PRICE_ESSENTIAL_YEARLY,
    process.env.STRIPE_PRICE_PRO,
    process.env.STRIPE_PRICE_PRO_YEARLY,
  ].filter(Boolean) as string[];
}

async function getSubscriptionUpdateProducts(): Promise<Stripe.BillingPortal.ConfigurationCreateParams.Features.SubscriptionUpdate.Product[]> {
  const productsById = new Map<string, Set<string>>();

  for (const priceId of getSubscriptionPriceIds()) {
    const price = await stripe.prices.retrieve(priceId);
    const productId = typeof price.product === "string" ? price.product : price.product.id;

    if (!productsById.has(productId)) {
      productsById.set(productId, new Set());
    }

    productsById.get(productId)?.add(price.id);
  }

  return Array.from(productsById.entries()).map(([product, prices]) => ({
    product,
    prices: Array.from(prices),
  }));
}

async function getPortalFeatures(): Promise<Stripe.BillingPortal.ConfigurationCreateParams.Features> {
  const subscriptionUpdateProducts = await getSubscriptionUpdateProducts();

  return {
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
      enabled: subscriptionUpdateProducts.length > 0,
      default_allowed_updates: ["price"],
      products: subscriptionUpdateProducts,
      proration_behavior: "create_prorations",
    },
  };
}

export async function getPortalConfigurationId() {
  const features = await getPortalFeatures();

  if (process.env.STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID) {
    try {
      const configuration = await stripe.billingPortal.configurations.retrieve(
        process.env.STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID
      );

      if (configuration.active) {
        const updated = await stripe.billingPortal.configurations.update(configuration.id, {
          features,
        });

        return updated.id;
      }
    } catch (error) {
      console.warn("Stripe customer portal configuration not found, falling back to Glowea default:", error);
    }
  }

  const configurations = await stripe.billingPortal.configurations.list({
    active: true,
    limit: 100,
  });
  const existing = configurations.data.find((configuration) => configuration.name === "Glowea abonnement");

  if (existing) {
    const updated = await stripe.billingPortal.configurations.update(existing.id, {
      features,
    });

    return updated.id;
  }

  const configuration = await stripe.billingPortal.configurations.create({
    name: "Glowea abonnement",
    features,
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
