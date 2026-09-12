import type { Metadata } from 'next';
import { Barlow, Chakra_Petch, Saira_Condensed } from 'next/font/google';

import './../globals.css';

/**
 * Le squelette de l'écran de sortie.
 *
 * ── Pourquoi ce fichier existait sans rien faire ──────────────────────────
 *
 * `/go` vit hors de `[langue]`, donc hors du layout qui charge la feuille de
 * style et les trois polices : ce layout-ci était resté celui que
 * `create-next-app` écrit — titre « Next.js », `lang="en"` en dur, aucun CSS.
 * L'écran de redirection s'affichait donc **sans aucun style**, en Times New
 * Roman sur fond blanc, juste avant d'envoyer le visiteur chez un partenaire.
 * C'est la dernière chose qu'il voit de nous : elle doit ressembler au site.
 *
 * L'attribut `lang` est posé côté client par `EcranDeSortie`, qui est le seul
 * à connaître la langue demandée — un layout n'a pas accès aux paramètres de
 * requête.
 */
const titre = Saira_Condensed({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  variable: '--police-titre',
  display: 'swap',
});

const ui = Chakra_Petch({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--police-ui',
  display: 'swap',
});

const corps = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--police-corps',
  display: 'swap',
});

/*
 * Une page de redirection n'a rien à faire dans un index : elle n'a pas de
 * contenu propre, et elle porte un lien de tracking à usage unique.
 */
export const metadata: Metadata = {
  title: 'where2spin',
  robots: { index: false, follow: false },
};

export default function LayoutDeSortie({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${titre.variable} ${ui.variable} ${corps.variable}`}>
      <body className="bg-fond">{children}</body>
    </html>
  );
}
