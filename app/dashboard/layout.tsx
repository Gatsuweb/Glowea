import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Navbar from "../components/Navbar";
import GlobalHeader from "../components/GlobalHeader";
import QuickAgendaDrawer from "../components/QuickAgendaDrawer";
import PushNotificationManager from "../components/PushNotificationManager";
import { getAgendaPanelData } from "../../lib/agendaPanelData";
import { getTenantId } from "../../lib/tenant";
import styles from "./layout.module.css";

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
  const quickAgendaData = await getAgendaPanelData(tenantId, userId);

  return (
    <>
      <Navbar />
      <GlobalHeader />
      <QuickAgendaDrawer agendaData={quickAgendaData} />
      <PushNotificationManager />
      <div className={styles.layoutWrapper}>
        <div className={styles.mainContent}>
          {children}
        </div>
      </div>
    </>
  );
}
