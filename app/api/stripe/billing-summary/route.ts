import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getTenantId } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isPaymentMethod(value: unknown): value is Stripe.PaymentMethod {
  if (!value || typeof value !== "object") return false;

  return "object" in value && (value as { object?: string }).object === "payment_method";
}

function formatPaymentMethod(paymentMethod: Stripe.PaymentMethod | null) {
  if (!paymentMethod) return null;

  if (paymentMethod.type === "card" && paymentMethod.card) {
    return {
      type: "card",
      brand: paymentMethod.card.brand,
      last4: paymentMethod.card.last4,
      expMonth: paymentMethod.card.exp_month,
      expYear: paymentMethod.card.exp_year,
    };
  }

  return {
    type: paymentMethod.type,
    brand: paymentMethod.type,
    last4: null,
    expMonth: null,
    expYear: null,
  };
}

async function getDefaultPaymentMethod(params: {
  customer: Stripe.Customer;
  customerId: string;
  subscriptionId: string | null;
}) {
  const customerDefault = params.customer.invoice_settings.default_payment_method;
  if (isPaymentMethod(customerDefault)) return customerDefault;

  if (params.subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(params.subscriptionId, {
        expand: ["default_payment_method"],
      });

      if (isPaymentMethod(subscription.default_payment_method)) {
        return subscription.default_payment_method;
      }
    } catch (error) {
      console.warn("Stripe subscription payment method lookup failed, falling back to customer methods:", error);
    }
  }

  const paymentMethods = await stripe.paymentMethods.list({
    customer: params.customerId,
    type: "card",
    limit: 1,
  });

  return paymentMethods.data[0] || null;
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ success: false, error: "Non autorise" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  if (!tenant?.stripeCustomerId) {
    return NextResponse.json({
      success: true,
      hasStripeCustomer: false,
      paymentMethod: null,
      invoices: [],
    });
  }

  try {
    const customer = await stripe.customers.retrieve(tenant.stripeCustomerId, {
      expand: ["invoice_settings.default_payment_method"],
    });

    if (customer.deleted) {
      return NextResponse.json({
        success: true,
        hasStripeCustomer: false,
        paymentMethod: null,
        invoices: [],
      });
    }

    const [paymentMethod, invoices] = await Promise.all([
      getDefaultPaymentMethod({
        customer,
        customerId: tenant.stripeCustomerId,
        subscriptionId: tenant.stripeSubscriptionId,
      }),
      stripe.invoices.list({
        customer: tenant.stripeCustomerId,
        limit: 8,
      }),
    ]);

    return NextResponse.json({
      success: true,
      hasStripeCustomer: true,
      paymentMethod: formatPaymentMethod(paymentMethod),
      invoices: invoices.data.map((invoice) => ({
        id: invoice.id,
        created: new Date(invoice.created * 1000).toISOString(),
        amountPaid: invoice.amount_paid,
        amountDue: invoice.amount_due,
        total: invoice.total,
        currency: invoice.currency,
        status: invoice.status,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
      })),
    });
  } catch (error) {
    console.error("Error fetching Stripe billing summary:", error);
    return NextResponse.json(
      { success: false, error: "Impossible de charger les informations de paiement." },
      { status: 500 }
    );
  }
}
