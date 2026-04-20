import Image from 'next/image';
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import styles from './TopHeader.module.css';

export default function TopHeader() {
  return (
    <header className={styles.header}>
      {/* Côté gauche : Logo sur fond rose pastel arrondi */}
      <div className={styles.leftBlob}>
        {/* On suppose que vous avez un logo.svg, sinon on peut mettre un texte en attendant */}
        <div className={styles.logoContainer}>
          {/* Si vous avez un logo.svg à la racine public, décommentez l'image et supprimez le texte */}
          <Image src="/logo.svg" alt="Glowéa" width={130} height={40} className={styles.logoImage} />
        </div>
      </div>

      {/* Côté droit : Notifications et Profil sur fond blanc arrondi */}
      <div className={styles.rightBlob}>
        <Show when="signed-out">
          <SignInButton fallbackRedirectUrl="/dashboard" mode="modal">
            <button className={styles.loginButton}>Connexion</button>
          </SignInButton>
        </Show>
        
        <Show when="signed-in">
          <button className={styles.notifButton}>
            {/* Si vous avez l'icône de cloche, remplacez src par "/icones/notifications.svg" ou similaire */}
            <Image src="/icones/notifications.svg" alt="Notifications" width={24} height={24} className={styles.notifIcon} />
          </button>
          
          <div className={styles.profileWrapper}>
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: styles.avatarBox,
                  userButtonTrigger: styles.userButtonTrigger
                }
              }}
            />
          </div>
        </Show>
      </div>
    </header>
  );
}
