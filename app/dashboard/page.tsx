import { currentUser } from "@clerk/nextjs/server";
import DashboardClientWrapper from "../components/DashboardClientWrapper";

export default async function DashboardPage() {
  const DEV_BYPASS_AUTH = process.env.NODE_ENV === "development";
  
  let user = null;
  if (!DEV_BYPASS_AUTH) {
    try {
      user = await currentUser();
    } catch (e) {
      console.error("Erreur Clerk ignorée:", e);
    }
  }

  const firstName = user?.firstName || "Sophie";
  const lastName = user?.lastName || "Doe";

  return (
    <DashboardClientWrapper firstName={firstName} lastName={lastName} />
  );
}
