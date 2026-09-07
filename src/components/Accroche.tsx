import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Conduite } from './DecorNeon';

/**
 * L'accroche de la page d'accueil.
 *
 * ── Le visuel est optionnel, et c'est délibéré ────────────────────────────
 *
 * La maquette pose une scène cyberpunk plein cadre derrière le titre. Tant
 * qu'elle n'existe pas, la page ne doit pas afficher un trou : le repli
 * ci-dessous est une composition à part entière — dégradés, grille, halos —
 * et non une zone vide en attente.
 *
 * La présence du fichier est vérifiée **au rendu, côté serveur**, pas par un
 * `onError` : un repli déclenché dans le navigateur produit un clignotement,
 * et l'accroche est précisément ce que le visiteur voit en premier.
 */
const VISUEL = '/images/accroche.webp';

export function Accroche({ children }: { children: React.ReactNode }) {
  const aVisuel = existsSync(join(process.cwd(), 'public', VISUEL));

  return (
    <section className="relative overflow-hidden bg-[#080b16]">
      {/* ── Le fond ─────────────────────────────────────────────────────── */}
      <div className="absolute inset-0" aria-hidden>
        {aVisuel ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={VISUEL} alt="" className="h-full w-full object-cover object-right" />
            {/* Le texte doit rester lisible quelle que soit l'image : le
                dégradé part du fond opaque à gauche, là où il court. */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#080b16] via-[#080b16]/85 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080b16] via-transparent to-[#080b16]/60" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-grille-neon bg-grille opacity-40" />
            <div className="absolute -right-24 top-0 h-full w-[70%] bg-[radial-gradient(closest-side,rgba(139,92,246,0.35),transparent)]" />
            <div className="absolute right-1/4 top-1/3 h-64 w-64 rounded-full bg-neon-magenta/20 blur-3xl" />
            <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-neon-cyan/15 blur-3xl" />
          </>
        )}
      </div>

      <div className="relative mx-auto max-w-[1440px] px-6 pb-12 pt-14 lg:pb-16 lg:pt-20">
        {children}
      </div>

      {/* La conduite qui referme l'accroche par le bas, coudée dans l'autre
          sens que celle de l'en-tête : les deux encadrent le bloc. */}
      <Conduite className="absolute bottom-0 left-0 h-[26px] w-full -scale-x-100" />
    </section>
  );
}
