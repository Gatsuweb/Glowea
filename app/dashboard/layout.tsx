import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Navbar from "../components/Navbar";
import GlobalHeader from "../components/GlobalHeader";

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
    <div style={{ paddingBottom: '100px', display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'url("/images/paper-texture.png")' }}>
      <GlobalHeader />
      <div style={{ flex: 1 }}>
        {children}
      </div>
      <Navbar />
    </div>
  );
}
