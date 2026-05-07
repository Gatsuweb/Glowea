"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className={styles.bottomNav}>
      <Link href="/dashboard/agenda" className={`${styles.navItem} ${pathname === '/dashboard/agenda' ? styles.active : ''}`}>
        <Image src="/icones/agenda.svg" alt="Agenda" width={58} height={58} className={styles.navIcon} />
      </Link>
      
      <div className={styles.separator}></div>

      <Link href="/dashboard/clients" className={`${styles.navItem} ${pathname === '/dashboard/clients' ? styles.active : ''}`}>
        <Image src="/icones/clients.svg" alt="Clients" width={58} height={58} className={styles.navIcon} />
      </Link>

      <div className={styles.separator}></div>

      {/* Le bouton du milieu contient directement son image complète, sans css supplémentaire */}
      <Link href="/dashboard" className={styles.centerButton}>
        <Image src="/icones/accueil.svg" alt="Dashboard" width={85} height={85} className={styles.centerIcon} />
      </Link>

      <div className={styles.separator}></div>

      <Link href="/dashboard/compta" className={`${styles.navItem} ${pathname === '/dashboard/compta' ? styles.active : ''}`}>
        <Image src="/icones/compta.svg" alt="Compta" width={58} height={58} className={styles.navIcon} />
      </Link>

      <div className={styles.separator}></div>

      <Link href="/dashboard/stock" className={`${styles.navItem} ${pathname === '/dashboard/stock' ? styles.active : ''}`}>
        <Image src="/icones/stock.svg" alt="Stock" width={58} height={58} className={styles.navIcon} />
      </Link>
    </nav>
  );
}
