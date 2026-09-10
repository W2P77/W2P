import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { Metadata } from 'next';

import { BANNIERE_OG } from '@/lib/metadonnees';
import { SITE_URL } from '@/lib/site';
import { Barlow, Chakra_Petch, Saira_Condensed } from 'next/font/google';
import './globals.css';

/*
 * ── Trois fontes, trois rôles ─────────────────────────────────────────────
 *
 * Jusqu'ici le site n'en chargeait aucune : il tombait sur Segoe UI, et un
 * titre en Segoe UI ne peut simplement pas produire l'allure de la maquette,
 * quel que soit le soin mis au reste. C'était le second écart après la
 * découpe, et le moins visible à décrire.
 *
 * · Saira Condensed, en noir, pour les grands titres : condensée, terminaisons
 *   droites, elle tient le bloc de deux lignes de l'accroche sans se disperser.
 * · Chakra Petch pour la navigation, les libellés et les boutons — ses angles
 *   coupés reprennent le biseau des panneaux, à l'échelle de la lettre.
 * · Barlow pour le texte courant : lisible à 14 px, neutre, elle laisse les
 *   deux autres porter le caractère.
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
 * L'anglais est la langue principale du site — les autres viendront ensuite.
 * `lang="fr"` restait de l'amorçage : il annonçait du français aux lecteurs
 * d'écran et aux moteurs sur des pages entièrement rédigées en anglais.
 */
const TITRE = 'where2spin — where to spin the slots you are looking for';
const DESCRIPTION =
  'RTP, volatility, max win and free demos. Every number says where it comes from, and how well it is verified.';

/*
 * L'image de partage n'est déclarée que si le fichier existe.
 *
 * Une balise `og:image` qui pointe vers une 404 est pire que pas de balise :
 * les réseaux sociaux mettent en cache l'échec, et le lien reste sans vignette
 * longtemps après que le fichier est arrivé. On vérifie donc la présence au
 * rendu, côté serveur — la même précaution que pour le visuel d'accroche.
 *
 * La version de l'URL vit dans `@/lib/metadonnees`, avec le repli qu'utilisent
 * les pages : deux endroits où l'écrire, c'est un endroit de trop.
 */
const OG = existsSync(join(process.cwd(), 'public', 'images', 'og.jpg'))
  ? BANNIERE_OG
  : undefined;

const OG_URL = OG;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITRE, template: '%s · where2spin' },
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: 'where2spin',
    title: TITRE,
    description: DESCRIPTION,
    url: SITE_URL,
    ...(OG_URL ? { images: [{ url: OG_URL, width: 1200, height: 630, alt: 'where2spin' }] } : {}),
  },
  twitter: {
    card: OG ? 'summary_large_image' : 'summary',
    title: TITRE,
    description: DESCRIPTION,
    ...(OG_URL ? { images: [OG_URL] } : {}),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${titre.variable} ${ui.variable} ${corps.variable}`}>
      <body>{children}</body>
    </html>
  );
}
