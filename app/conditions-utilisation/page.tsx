import type { Metadata } from "next";
import LegalPage from "../components/LegalPage";

const title = "Conditions d'utilisation";
const description =
  "Les conditions applicables à l'utilisation de Glowea, SaaS de gestion pour professionnelles de la beauté.";

export const metadata: Metadata = {
  title,
  description,
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/conditions-utilisation",
  },
};

export default function TermsPage() {
  return (
    <LegalPage title={title} description={description} updatedAt="30 juin 2026">
      <section>
        <h2>Objet du service</h2>
        <p>
          Glowea est un service SaaS destiné aux professionnelles de la beauté.
          La plateforme aide à gérer les clientes, les rendez-vous, les séances
          techniques, le suivi d&apos;activité et les outils associés à
          l&apos;organisation quotidienne.
        </p>
      </section>

      <section>
        <h2>Usages autorises</h2>
        <p>
          L&apos;utilisateur s&apos;engage a utiliser Glowea pour une activite
          professionnelle legitime, dans le respect des lois applicables et des
          droits des personnes dont les donnees sont saisies dans la plateforme.
        </p>
        <p>
          Toute utilisation frauduleuse, abusive, illicite ou portant atteinte
          au bon fonctionnement du service est interdite.
        </p>
      </section>

      <section>
        <h2>Responsabilité des données saisies</h2>
        <p>
          L&apos;utilisateur est responsable des informations qu&apos;il saisit dans
          Glowea, notamment les données relatives à ses clientes, ses
          rendez-vous et son activité. Il lui appartient de s&apos;assurer qu&apos;il
          dispose des droits et informations nécessaires pour les traiter.
        </p>
      </section>

      <section>
        <h2>Évolution des fonctionnalités</h2>
        <p>
          Glowea peut évoluer au fil du temps. Des fonctionnalités peuvent être
          ajoutées, modifiées, suspendues ou supprimées afin d&apos;améliorer le
          service, de renforcer sa sécurité ou de l&apos;adapter aux besoins des
          utilisateurs.
        </p>
      </section>

      <section>
        <h2>Paiements</h2>
        <p>
          Les paiements liés à Glowea sont gérés par Stripe. Glowea ne stocke
          pas directement les informations completes de carte bancaire.
        </p>
      </section>

      <section>
        <h2>Suspension de compte</h2>
        <p>
          Glowea peut suspendre ou restreindre l&apos;accès à un compte en cas
          d&apos;abus, de comportement frauduleux, de non-respect des presentes
          conditions ou de risque pour la sécurité du service.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Pour toute question concernant ces conditions, vous pouvez nous
          contacter à{" "}
          <a href="mailto:ivanduran@gloweaapp.com">ivanduran@gloweaapp.com</a>.
        </p>
      </section>
    </LegalPage>
  );
}
