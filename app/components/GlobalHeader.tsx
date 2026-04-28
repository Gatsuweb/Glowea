import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import styles from "./GlobalHeader.module.css";
import NotificationBell from "./NotificationBell";

export default async function GlobalHeader() {
  const DEV_BYPASS_AUTH = process.env.NODE_ENV === "development";
  
  let user = null;
  if (!DEV_BYPASS_AUTH) {
    try {
      user = await currentUser();
    } catch (e) {
      console.error("Erreur Clerk ignorée:", e);
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.logoContainer}>
        <Image src="/logo.svg" alt="Glowéa" width={185} height={55} priority />
      </div>
      <div className={styles.userSection}>
        <Link href="/dashboard/profil" className={styles.iconBtn} title="Paramètres & Profil">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </Link>
        <NotificationBell />
        <div className={styles.avatarWrapper}>
          <UserButton 
            appearance={{
              elements: {
                userButtonAvatarBox: {
                  width: "100%",
                  height: "100%",
                }
              }
            }}
          />
        </div>
      </div>
    </header>
  );
}