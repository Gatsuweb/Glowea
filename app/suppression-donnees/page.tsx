import type { Metadata } from "next";
import LegalPage from "../components/LegalPage";

const title = "Suppression des données utilisateur";
const description =
  "Instructions pour demander la suppression des données associées à un compte Glowea, y compris après une connexion Facebook.";

export const metadata: Metadata = {
  title,
  description,
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/suppression-donnees",
  },
};

export default function DataDeletionPage() {
  return (
    <LegalPage title={title} description={description} updatedAt="30 juin 2026">
      <section>
        <h2>Instructions de suppression</h2>
        <p>
          Cette page explique comment demander la suppression des données
          utilisateur associées à un compte Glowea. Elle est notamment fournie
          pour répondre aux exigences de Meta et Facebook Login.
        </p>
      </section>

      <section>
        <h2>Comment faire une demande</h2>
        <p>
          Pour demander la suppression de vos données, envoyez un email à{" "}
          <a href="mailto:ivanduran@gloweaapp.com">ivanduran@gloweaapp.com</a>.
        </p>
        <p>
          Merci de préciser dans votre message l&apos;adresse email du compte Glowea
          concerné afin que nous puissions identifier les données à traiter.
        </p>
      </section>

      <section>
        <h2>Connexion via Facebook</h2>
        <p>
          Si vous vous êtes connecté à Glowea via Facebook, vous pouvez demander
          la suppression des données associées à votre compte Facebook en nous
          contactant a l&apos;adresse indiquee ci-dessus.
        </p>
      </section>

      <section>
        <h2>Délai de traitement</h2>
        <p>
          Les demandes de suppression sont traitées dans un délai raisonnable
          après réception des informations nécessaires à l&apos;identification du
          compte.
        </p>
      </section>

      <section>
        <h2>Conservation temporaire</h2>
        <p>
          Certaines données peuvent être conservées temporairement lorsque cela
          est nécessaire pour respecter des obligations légales, comptables ou
          de sécurité.
        </p>
      </section>
    </LegalPage>
  );
}
