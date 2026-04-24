import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import Image from "next/image";
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