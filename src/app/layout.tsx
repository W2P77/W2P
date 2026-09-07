import type { Metadata } from 'next';
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
export const metadata: Metadata = {
  title: {
    default: 'where2play — where to play the slots you are looking for',
    template: '%s · where2play',
  },
  description:
    'RTP, volatility, max win and free demos. Every number says where it comes from, and how well it is verified.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${titre.variable} ${ui.variable} ${corps.variable}`}>
      <body>{children}</body>
    </html>
  );
}
