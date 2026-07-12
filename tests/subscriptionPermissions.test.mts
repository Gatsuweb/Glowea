import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getSubscriptionAccessFromTenant } from "../lib/subscriptionAccess.ts";

function activeTenant(plan: "FREE" | "PRESENCE" | "ESSENTIAL" | "PRO" | "PREMIUM") {
  return {
    subscriptionPlan: plan,
    subscriptionStatus: "ACTIVE" as const,
    trialEndsAt: null,
    Subscription: null,
  };
}

describe("subscription permissions", () => {
  it("allows Presence to edit the public page without booking or main dashboard access", () => {
    const access = getSubscriptionAccessFromTenant(activeTenant("PRESENCE"));

    assert.equal(access.canUsePresenceDashboard, true);
    assert.equal(access.canUseMainDashboard, false);
    assert.equal(access.canUseApp, false);
    assert.equal(access.canUsePublicPage, true);
    assert.equal(access.canEditPublicPage, true);
    assert.equal(access.canUseBooking, false);
    assert.equal(access.canManageBookingSettings, false);
    assert.equal(access.canUseAppointments, false);
    assert.equal(access.canUseClients, false);
    assert.equal(access.canUseCrm, false);
    assert.equal(access.canUseStats, false);
    assert.equal(access.canUseStripePayments, false);
    assert.equal(access.canUsePaymentLinks, false);
    assert.equal(access.canUseDeposits, false);
    assert.equal(access.canUseSms, false);
    assert.equal(access.canUseCampaigns, false);
  });

  it("keeps Essential on the main dashboard without Pro booking features", () => {
    const access = getSubscriptionAccessFromTenant(activeTenant("ESSENTIAL"));

    assert.equal(access.canUseMainDashboard, true);
    assert.equal(access.canUseApp, true);
    assert.equal(access.canUsePresenceDashboard, false);
    assert.equal(access.canUsePublicPage, false);
    assert.equal(access.canUseBooking, false);
    assert.equal(access.canUseSms, false);
    assert.equal(access.canUseClients, true);
    assert.equal(access.canUseAppointments, true);
  });

  it("keeps Pro access to public booking, SMS and the main dashboard", () => {
    const access = getSubscriptionAccessFromTenant(activeTenant("PRO"));

    assert.equal(access.canUseMainDashboard, true);
    assert.equal(access.canUsePublicPage, true);
    assert.equal(access.canEditPublicPage, true);
    assert.equal(access.canUseBooking, true);
    assert.equal(access.canManageBookingSettings, true);
    assert.equal(access.canUseStripePayments, true);
    assert.equal(access.canUseSms, true);
    assert.equal(access.canUseCampaigns, true);
  });

  it("preserves the existing Pro trial access for trialing Free tenants", () => {
    const access = getSubscriptionAccessFromTenant({
      subscriptionPlan: "FREE",
      subscriptionStatus: "TRIALING" as const,
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      Subscription: null,
    });

    assert.equal(access.currentPlan, "FREE");
    assert.equal(access.isTrialing, true);
    assert.equal(access.canUseMainDashboard, true);
    assert.equal(access.canUsePublicPage, true);
    assert.equal(access.canUseBooking, true);
    assert.equal(access.canUseSms, true);
  });

  it("blocks every paid feature when the subscription is canceled", () => {
    const access = getSubscriptionAccessFromTenant({
      ...activeTenant("PRESENCE"),
      subscriptionStatus: "CANCELED" as const,
    });

    assert.equal(access.isActive, false);
    assert.equal(access.canUsePresenceDashboard, false);
    assert.equal(access.canUsePublicPage, false);
    assert.equal(access.canEditPublicPage, false);
  });
});
