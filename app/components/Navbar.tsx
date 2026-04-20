import Image from 'next/image';
import Link from 'next/link';
import styles from './Navbar.module.css';

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <Link href="/agenda" className={styles.navItem}>
        <Image src="/icones/agenda.svg" alt="Agenda" width={56} height={56} className={styles.icon} />
      </Link>
      
      <Link href="/clients" className={styles.navItem}>
        <Image src="/icones/clients.svg" alt="Clients" width={56} height={56} className={styles.icon} />
      </Link>

      <div className={styles.centerItem}>
        <Link href="/dashboard" className={styles.centerButtonContainer}>
          <Image src="/icones/accueil.svg" alt="Dashboard" width={98} height={98} className={styles.centerIcon} />
        </Link>
      </div>

      <Link href="/compta" className={styles.navItem}>
        <Image src="/icones/compta.svg" alt="Comptabilité" width={56} height={56} className={styles.icon} />
      </Link>

      <Link href="/stock" className={styles.navItem}>
        <Image src="/icones/stock.svg" alt="Stock" width={56} height={56} className={styles.icon} />
      </Link>
    </nav>
  );
}
