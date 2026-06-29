/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config();

const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing DIRECT_URL or DATABASE_URL.");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function usage() {
  console.log([
    "Usage:",
    "  npm run billing:admin -- grant-unlimited user@example.com",
    "  npm run billing:admin -- reset-stripe user@example.com",
    "  npm run billing:admin -- reset-stripe-customer cus_xxx",
    "  npm run billing:admin -- list-stripe",
    "  npm run billing:admin -- audit user@example.com",
  ].join("\n"));
}

function subscriptionRecordId(tenantId) {
  return `sub_manual_${tenantId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`;
}

async function findTenantByEmail(email) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      tenantId: true,
      Tenant: {
        select: {
          id: true,
          name: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
          stripePriceId: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error(`No user found for ${email}.`);
  }

  return user;
}

async function resetStripeReferencesForTenant(tenantId) {
  const now = new Date();

  await prisma.$transaction([
    prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionPlan: "FREE",
        subscriptionStatus: "CANCELED",
        trialEndsAt: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        updatedAt: now,
      },
    }),
    prisma.subscription.updateMany({
      where: { tenantId },
      data: {
        providerCustomerId: null,
        providerSubscriptionId: null,
        status: "CANCELED",
        planName: "FREE",
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        updatedAt: now,
      },
    }),
  ]);
}

async function grantUnlimitedAccess(email) {
  const user = await findTenantByEmail(email);
  const now = new Date();

  await prisma.$transaction([
    prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        subscriptionPlan: "PREMIUM",
        subscriptionStatus: "ACTIVE",
        trialEndsAt: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        updatedAt: now,
      },
    }),
    prisma.subscription.upsert({
      where: { tenantId: user.tenantId },
      create: {
        id: subscriptionRecordId(user.tenantId),
        tenantId: user.tenantId,
        provider: "OTHER",
        providerCustomerId: null,
        providerSubscriptionId: null,
        status: "ACTIVE",
        planName: "PREMIUM",
        currentPeriodStart: now,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        updatedAt: now,
      },
      update: {
        provider: "OTHER",
        providerCustomerId: null,
        providerSubscriptionId: null,
        status: "ACTIVE",
        planName: "PREMIUM",
        currentPeriodStart: now,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        updatedAt: now,
      },
    }),
  ]);

  console.log(`Granted unlimited access to ${email} on tenant ${user.tenantId}.`);
}

async function resetStripeByEmail(email) {
  const user = await findTenantByEmail(email);
  await resetStripeReferencesForTenant(user.tenantId);
  console.log(`Reset Stripe billing references for ${email} on tenant ${user.tenantId}.`);
}

async function resetStripeByCustomerId(customerId) {
  const tenants = await prisma.tenant.findMany({
    where: { stripeCustomerId: customerId },
    select: { id: true, name: true },
  });

  if (tenants.length === 0) {
    console.log(`No tenant found with stripeCustomerId ${customerId}.`);
    return;
  }

  for (const tenant of tenants) {
    await resetStripeReferencesForTenant(tenant.id);
    console.log(`Reset Stripe billing references for tenant ${tenant.id} (${tenant.name}).`);
  }
}

async function listStripeReferences() {
  const tenants = await prisma.tenant.findMany({
    where: {
      OR: [
        { stripeCustomerId: { not: null } },
        { stripeSubscriptionId: { not: null } },
        { stripePriceId: { not: null } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripePriceId: true,
      User: {
        take: 1,
        select: { email: true },
      },
    },
  });

  if (tenants.length === 0) {
    console.log("No tenants have Stripe billing references.");
    return;
  }

  for (const tenant of tenants) {
    console.log([
      tenant.User[0]?.email || "no-email",
      tenant.id,
      tenant.subscriptionPlan,
      tenant.subscriptionStatus,
      tenant.stripeCustomerId || "no-customer",
      tenant.stripeSubscriptionId || "no-subscription",
      tenant.stripePriceId || "no-price",
    ].join(" | "));
  }
}

async function auditByEmail(email) {
  const user = await findTenantByEmail(email);
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId: user.tenantId },
    select: {
      provider: true,
      providerCustomerId: true,
      providerSubscriptionId: true,
      status: true,
      planName: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  });

  console.log([
    `email=${user.email}`,
    `tenantId=${user.tenantId}`,
    `tenantName=${user.Tenant.name}`,
    `tenantPlan=${user.Tenant.subscriptionPlan}`,
    `tenantStatus=${user.Tenant.subscriptionStatus}`,
    `stripeCustomerId=${user.Tenant.stripeCustomerId || "null"}`,
    `stripeSubscriptionId=${user.Tenant.stripeSubscriptionId || "null"}`,
    `stripePriceId=${user.Tenant.stripePriceId || "null"}`,
    `subscriptionProvider=${subscription?.provider || "null"}`,
    `subscriptionPlan=${subscription?.planName || "null"}`,
    `subscriptionStatus=${subscription?.status || "null"}`,
  ].join("\n"));
}

async function main() {
  const [command, ...values] = process.argv.slice(2);

  if (!command || (values.length === 0 && command !== "list-stripe")) {
    usage();
    process.exit(1);
  }

  if (command === "grant-unlimited") {
    for (const email of values) {
      await grantUnlimitedAccess(email);
    }
    return;
  }

  if (command === "reset-stripe") {
    for (const email of values) {
      await resetStripeByEmail(email);
    }
    return;
  }

  if (command === "reset-stripe-customer") {
    for (const customerId of values) {
      await resetStripeByCustomerId(customerId);
    }
    return;
  }

  if (command === "list-stripe") {
    await listStripeReferences();
    return;
  }

  if (command === "audit") {
    for (const email of values) {
      await auditByEmail(email);
    }
    return;
  }

  usage();
  process.exit(1);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
