import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import PresenceClient from "./PresenceClient";
import { getPresencePageConfig } from "../../actions/publicPageActions";
import { PRICING_PATH } from "../../../lib/pricing";
import { getTenantSubscriptionAccess } from "../../../lib/subscription";
import { syncCheckoutSessionById } from "../../../lib/stripeSubscriptionSync";
import { getTenantId } from "../../../lib/tenant";

export const dynamic = "force-dynamic";

export default async function PresenceDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; session_id?: string }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantId();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  let checkoutSyncState: "activated" | "pending" | "error" | null = null;

  if (resolvedSearchParams.success === "true" && resolvedSearchParams.session_id) {
    try {
      const syncResult = await syncCheckoutSessionById(resolvedSearchParams.session_id, tenantId);
      checkoutSyncState = syncResult.synced && syncResult.status === "ACTIVE" ? "activated" : "pending";
    } catch (error) {
      console.error("[stripe:presence] checkout sync failed", error);
      checkoutSyncState = "error";
    }
  }

  const access = await getTenantSubscriptionAccess(tenantId);

  if (!access.canUsePresenceDashboard) {
    if (access.canUseMainDashboard) {
      redirect("/dashboard");
    }

    redirect(PRICING_PATH);
  }

  const data = await getPresencePageConfig();
  if (!data.success) {
    redirect(PRICING_PATH);
  }

  return (
    <PresenceClient
      initialData={data}
      checkoutSuccess={resolvedSearchParams.success === "true"}
      checkoutSyncState={checkoutSyncState}
    />
  );
}
