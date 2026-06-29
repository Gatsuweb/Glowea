import { auth, currentUser } from "@clerk/nextjs/server";
import AgendaClientWrapper from "../../components/AgendaClientWrapper";
import { getAgendaPanelData } from "../../../lib/agendaPanelData";
import { getTenantSubscriptionAccess } from "../../../lib/subscription";
import { syncAppointmentPaymentFromCheckoutSessionId } from "../../../lib/stripeAppointmentSync";

export const dynamic = "force-dynamic";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams?: Promise<{ payment?: string; session_id?: string; appointmentId?: string }>;
}) {
  const DEV_BYPASS_AUTH = process.env.NODE_ENV === "development";

  if (!DEV_BYPASS_AUTH) {
    try {
      await currentUser();
    } catch (error) {
      console.error("Erreur Clerk ignoree:", error);
    }
  }

  const { getTenantId } = await import("../../../lib/tenant");
  const tenantId = await getTenantId();
  const { userId } = await auth();
  const resolvedSearchParams = searchParams ? await searchParams : {};

  if (resolvedSearchParams.payment === "success" && resolvedSearchParams.session_id) {
    try {
      await syncAppointmentPaymentFromCheckoutSessionId(
        resolvedSearchParams.session_id,
        resolvedSearchParams.appointmentId || null
      );
    } catch (error) {
      console.error("[stripe:agenda] checkout sync failed", error);
    }
  }

  const [agendaData, subscriptionAccess] = await Promise.all([
    getAgendaPanelData(tenantId, userId),
    getTenantSubscriptionAccess(tenantId),
  ]);

  return (
    <AgendaClientWrapper
      {...agendaData}
      isReadOnlyAccess={subscriptionAccess.isReadOnly}
      readOnlyMessage={subscriptionAccess.message || undefined}
    />
  );
}
