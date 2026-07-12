import React from "react";
import ComptaClient from "./ComptaClient";
import { getVueEnsembleData, getStatsData } from "../../../actions/comptaActions";
import { getTenantId } from "../../../../lib/tenant";
import { getTenantSubscriptionAccess } from "../../../../lib/subscription";

export const dynamic = "force-dynamic";

export default async function ComptaPage() {
  const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2024-05"
  const tenantId = await getTenantId();
  
  const [response, statsResponse, subscriptionAccess] = await Promise.all([
    getVueEnsembleData(currentMonth),
    getStatsData(currentMonth),
    getTenantSubscriptionAccess(tenantId)
  ]);

  const initialData = response.success && response.data ? response.data : {
    transactions: [],
    prevTransactions: [],
    recurringExpenses: []
  };

  const initialStatsData = statsResponse.success && statsResponse.data ? statsResponse.data : null;

  return (
    <ComptaClient
      initialData={initialData}
      initialStatsData={initialStatsData}
      currentMonth={currentMonth}
      isReadOnlyAccess={subscriptionAccess.isReadOnly}
      readOnlyMessage={subscriptionAccess.message || undefined}
    />
  );
}
