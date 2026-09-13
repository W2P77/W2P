import Script from 'next/script';

/**
 * La balise de mesure Google (GA4).
 *
 * ── Pourquoi un composant et pas deux copies ──────────────────────────────
 *
 * Le site a **deux racines** : `[langue]/layout.tsx` pour les pages publiques
 * et `go/layout.tsx` pour l'écran de sortie, qui vit hors de `[langue]` et
 * n'hérite donc de rien. Google demande une balise par page et **une seule** :
 * la poser en double sur une même page compterait deux fois la même visite.
 * Un composant partagé rend l'oubli et le doublon également impossibles.
 *
 * ── Pourquoi `afterInteractive` ───────────────────────────────────────────
 *
 * La mesure n'a pas à retarder l'affichage. `afterInteractive` charge le script
 * une fois la page utilisable — c'est la stratégie que Next recommande pour un
 * marqueur d'analyse, et elle évite de faire payer au visiteur le temps de
 * chargement d'un outil qui ne lui sert pas.
 *
 * ⚠️ Aucun consentement n'est demandé aujourd'hui. GA4 dépose des identifiants
 * et le site s'adresse à l'Europe : c'est une dette à régler avant de pousser
 * sur l'acquisition, pas un détail de conformité théorique.
 */
export const ID_MESURE = 'G-0WS4MZBLM6';

export function Mesure() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${ID_MESURE}`}
        strategy="afterInteractive"
      />
      <Script id="mesure-google" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${ID_MESURE}');`}
      </Script>
    </>
  );
}
