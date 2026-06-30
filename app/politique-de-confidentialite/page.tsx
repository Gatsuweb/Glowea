import type { Metadata } from "next";
import LegalPage from "../components/LegalPage";

const title = "Politique de confidentialité";
const description =
  "Comment Glowea collecte, utilise et protège les données des professionnelles de la beauté et de leurs clientes.";

export const metadata: Metadata = {
  title,
  description,
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/politique-de-confidentialite",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title={title} description={description} updatedAt="30 juin 2026">
      <section>
        <h2>Présentation de Glowea</h2>
        <p>
          Glowea est une plateforme de gestion destinée aux professionnelles de
          la beauté, notamment les spécialistes des extensions de cils, lash
          lift, browlift et ongles. Elle permet d&apos;organiser les clientes, les
          rendez-vous, les séances techniques, les paiements et le suivi de
          l&apos;activité.
        </p>
      </section>

      <section>
        <h2>Données collectées</h2>
        <p>
          Dans le cadre de l&apos;utilisation de Glowea, nous pouvons collecter et
          traiter les catégories de données suivantes :
        </p>
        <ul>
          <li>données de compte utilisateur ;</li>
          <li>nom, prénom et adresse email ;</li>
          <li>données liées aux rendez-vous ;</li>
          <li>données clientes saisies par les professionnelles ;</li>
          <li>données de paiement traitées par Stripe ;</li>
          <li>données de connexion via Clerk, Google ou Facebook.</li>
        </ul>
      </section>

      <section>
        <h2>Utilisation des données</h2>
        <p>
          Les données sont utilisées pour fournir le service Glowea, sécuriser
          l&apos;acces aux comptes, gerer les rendez-vous, faciliter le suivi client,
          envoyer les notifications nécessaires et permettre la facturation des
          abonnements ou paiements associés.
        </p>
        <p>
          Glowea ne revend pas les données personnelles des utilisateurs ou des
          clientes saisies dans la plateforme.
        </p>
      </section>

      <section>
        <h2>Services tiers utilisés</h2>
        <p>
          Glowea s&apos;appuie sur certains prestataires techniques pour fournir le
          service :
        </p>
        <ul>
          <li>Clerk pour l&apos;authentification ;</li>
          <li>Stripe pour les paiements ;</li>
          <li>Resend pour les emails transactionnels ;</li>
          <li>Twilio pour les SMS lorsque ces fonctionnalités sont activées ;</li>
          <li>Supabase et la base de données pour le stockage des données.</li>
        </ul>
      </section>

      <section>
        <h2>Droits des utilisateurs</h2>
        <p>
          Conformément aux règles applicables en matière de protection des
          données, vous pouvez demander l&apos;accès, la rectification, la
          suppression ou l&apos;opposition au traitement de vos données personnelles.
        </p>
        <p>
          Pour exercer ces droits, contactez-nous a{" "}
          <a href="mailto:ivanduran@gloweaapp.com">ivanduran@gloweaapp.com</a>.
        </p>
      </section>
    </LegalPage>
  );
}
