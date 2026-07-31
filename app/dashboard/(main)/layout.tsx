import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Navbar from "../../components/Navbar";
import GlobalHeader from "../../components/GlobalHeader";
import OnboardingChecklist from "../../components/OnboardingChecklist";
import QuickAgendaDrawer from "../../components/QuickAgendaDrawer";
import PushNotificationManager from "../../components/PushNotificationManager";
import TrialExpiredPricingRedirect from "../../components/TrialExpiredPricingRedirect";
import { getAgendaPanelData } from "../../../lib/agendaPanelData";
import { getTenantSubscriptionAccess } from "../../../lib/subscription";
import { getTenantId } from "../../../lib/tenant";
import { getTenantOnboardingState } from "../../actions/onboardingActions";
import styles from "../layout.module.css";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const DEV_BYPASS_AUTH = process.env.NODE_ENV === "development";
  let userId: string | null = null;

  if (!DEV_BYPASS_AUTH) {
    const authResult = await auth();
    userId = authResult.userId;
    if (!userId) {
      redirect("/sign-in");
    }
  }

  const tenantId = await getTenantId();
  const subscriptionAccess = await getTenantSubscriptionAccess(tenantId);

  if (subscriptionAccess.canUsePresenceDashboard && !subscriptionAccess.canUseMainDashboard) {
    redirect("/dashboard/presence");
  }

  const [quickAgendaData, onboarding] = await Promise.all([
    getAgendaPanelData(tenantId, userId),
    getTenantOnboardingState(tenantId),
  ]);
  const quickAgendaProps = {
    ...quickAgendaData,
    isReadOnlyAccess: subscriptionAccess.isReadOnly,
    readOnlyMessage: subscriptionAccess.message || undefined,
  };

  return (
    <>
      <Suspense fallback={null}>
        <TrialExpiredPricingRedirect subscriptionAccess={subscriptionAccess} />
      </Suspense>
      <Navbar />
      <GlobalHeader />
      <QuickAgendaDrawer agendaData={quickAgendaProps} />
      <PushNotificationManager />
      <OnboardingChecklist onboarding={onboarding} />
      <div className={styles.layoutWrapper}>
        <div className={styles.mainContent}>
          {children}
        </div>
      </div>
    </>
  );
}
