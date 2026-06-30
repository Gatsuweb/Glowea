"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "./Navbar.module.css";

export default function Navbar() {
  const pathname = usePathname();
  const paymentsActive = pathname === "/settings/payments";

  return (
    <>
      <nav className={styles.bottomNav}>
        <Link
          href="/dashboard/agenda"
          className={`${styles.navItem} ${pathname === "/dashboard/agenda" ? styles.active : ""}`}
        >
          <Image src="/icones/agenda.svg" alt="Agenda" width={58} height={58} className={styles.navIcon} />
        </Link>

        <div className={styles.separator}></div>

        <Link
          href="/dashboard/clients"
          className={`${styles.navItem} ${pathname === "/dashboard/clients" ? styles.active : ""}`}
        >
          <Image src="/icones/clients.svg" alt="Clients" width={58} height={58} className={styles.navIcon} />
        </Link>

        <div className={styles.separator}></div>

        <Link href="/dashboard" className={styles.centerButton}>
          <Image src="/icones/accueil.svg" alt="Dashboard" width={85} height={85} className={styles.centerIcon} />
        </Link>

        <div className={styles.separator}></div>

        <Link
          href="/dashboard/compta"
          className={`${styles.navItem} ${pathname === "/dashboard/compta" ? styles.active : ""}`}
        >
          <Image src="/icones/compta.svg" alt="Compta" width={58} height={58} className={styles.navIcon} />
        </Link>

        <div className={styles.separator}></div>

        <Link
          href="/dashboard/stock"
          className={`${styles.navItem} ${pathname === "/dashboard/stock" ? styles.active : ""}`}
        >
          <Image src="/icones/stock.svg" alt="Stock" width={58} height={58} className={styles.navIcon} />
        </Link>
      </nav>

      <Link
        href="/settings/payments"
        className={`${styles.paymentShortcut} ${paymentsActive ? styles.paymentShortcutActive : ""}`}
        aria-label="Configurer Stripe et les arrhes"
        title="Configurer Stripe et les arrhes"
      >
        <span className={styles.paymentShortcutIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2"></rect>
            <line x1="2" y1="10" x2="22" y2="10"></line>
            <path d="M7 15h4"></path>
            <path d="M16 15h1"></path>
          </svg>
        </span>
        <span>Paiements</span>
      </Link>
    </>
  );
}
