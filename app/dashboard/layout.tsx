import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Navbar from "../components/Navbar";
import GlobalHeader from "../components/GlobalHeader";
import styles from "./layout.module.css";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const DEV_BYPASS_AUTH = process.env.NODE_ENV === "development";

  if (!DEV_BYPASS_AUTH) {
    const { userId } = await auth();
    if (!userId) {
      redirect("/sign-in");
    }
  }

  return (
    <>
      <Navbar />
        <GlobalHeader />
    <div className={styles.layoutWrapper}>
      <div className={styles.mainContent}>
        {children}
      </div>
    </div>
    </>
  );
}
