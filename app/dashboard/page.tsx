import { currentUser } from "@clerk/nextjs/server";
import Image from "next/image";
import styles from "./dashboard.module.css";
import SummaryCards from "../components/SummaryCards";
import MainDashboardSection from "../components/MainDashboardSection";
import WidgetsSection from "../components/WidgetsSection";
import AddAppointmentButton from "../components/AddAppointmentButton";
import AddClientButton from "../components/AddClientButton";

export default async function DashboardPage() {
  const user = await currentUser();
  // Pour l'instant en hardcode, mais on prépare le terrain pour le prénom plus tard
  // const firstName = user?.firstName || "Sophie";
  
  return (
    <main className={styles.mainContainer}>
      <header className={styles.headerSection}>
        <div className={styles.headerTitles}>
          <h1 className={styles.welcomeTitle}>
            Bienvenue {user?.firstName || "Utilisateur"} {user?.lastName || "Utilisateur"}
          </h1>
          <p className={styles.dateSubtitle}>
            JEUDI 26 MARS - 3 RENDEZ-VOUS AUJOURD'HUI
          </p>
        </div>

        <div className={styles.actionButtons}>
          <AddAppointmentButton className={styles.iconButton} iconClassName={styles.plusIcon} />
          <AddClientButton className={styles.iconButton} buttonIconClassName={styles.buttonIcon} />
          <button className={styles.iconButton}>
            <Image src="/icones/compta.svg" alt="Comptabilité" width={24} height={24} className={styles.buttonIcon} />
          </button>
        </div>
      </header>

      {/* Section des cartes */}
      <SummaryCards />

      {/* Section Principale (Rendez-vous et Graphique) */}
      <MainDashboardSection />

      {/* Section Widgets & Stock */}
      <WidgetsSection />
    </main>
  );
}
