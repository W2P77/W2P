import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { BorneNeon } from './BorneNeon';
import { Conduite } from './DecorNeon';

/**
 * L'accroche de la page d'accueil.
 *
 * ── Le flanc droit ne peut pas rester vide ────────────────────────────────
 *
 * La maquette y pose une scène cyberpunk rendue en 3D, et c'est la moitié qui
 * donne son poids à la page. Tant que ce rendu n'existe pas, un aplat dégradé
 * ne remplit pas le vide : il le signale. La borne tracée le tient — même
 * vocabulaire de néons et d'angles que le reste du site — et disparaît d'elle
 * même le jour où le fichier arrive.
 *
 * La présence de ce fichier est vérifiée **au rendu, côté serveur**, jamais
 * par un `onError` : un repli déclenché dans le navigateur produit un
 * clignotement, et l'accroche est ce que le visiteur voit en premier.
 *
 * ── Le cadre ─────────────────────────────────────────────────────────────
 *
 * Sur la maquette, l'accroche est **tenue par un cadre biseauté**, pas posée
 * dans le flux. C'est lui qui la fait lire comme un panneau de contrôle plutôt
 * que comme un bandeau — et sans lui, le titre flotte quelle que soit la
 * qualité du reste.
 */
/**
 * Plusieurs extensions sont acceptées, et ce n'est pas de la complaisance :
 * un générateur d'images rend du PNG ou du JPEG, rarement du WebP. N'accepter
 * qu'une extension aurait produit un fichier déposé au bon endroit, au bon
 * nom, et toujours invisible — la panne la plus agaçante qui soit.
 */
const EXTENSIONS = ['webp', 'jpg', 'jpeg', 'png', 'avif'];

function trouverVisuel(): string | null {
  for (const ext of EXTENSIONS) {
    const chemin = `/images/accroche.${ext}`;
    if (existsSync(join(process.cwd(), 'public', chemin))) return chemin;
  }
  return null;
}

export function Accroche({ children }: { children: React.ReactNode }) {
  const VISUEL = trouverVisuel();
  const aVisuel = VISUEL !== null;

  return (
    <section className="relative overflow-hidden bg-[#080b16]">
      {/* ── Le fond ─────────────────────────────────────────────────────── */}
      <div className="absolute inset-0" aria-hidden>
        {aVisuel ? (
          <>
            {/*
             * ── Le visuel occupe le flanc droit, pas tout le cadre ────────
             *
             * En plein cadre, deux choses se cassent à la fois : la borne est
             * recadrée à 51 % de sa hauteur — couronne et socle coupés — et
             * les enseignes du milieu de rue passent derrière le titre et la
             * barre de recherche, où elles ne sont que du bruit.
             *
             * Sur la maquette, l'image tient un panneau à droite, séparé par
             * une arête diagonale. Ce panneau fait ~2:1 contre 1,78:1 pour le
             * rendu : le recadrage tombe à 11 % au lieu de 49 %, la borne
             * reste entière, et la moitié gauche redevient du noir franc où
             * le titre se pose sans lutter.
             */}
            <div
              className="absolute inset-y-0 right-0 w-full lg:w-[62%]"
              style={{ clipPath: 'polygon(14% 0, 100% 0, 100% 100%, 0 100%)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={VISUEL!}
                alt=""
                className="h-full w-full object-cover"
                style={{ objectPosition: '78% 42%' }}
              />
              {/* Le fondu vers la gauche : l'image doit entrer dans la page,
                  pas y être collée comme une vignette rapportée. */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#070a14] via-[#070a14]/35 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070a14]/70 via-transparent to-[#070a14]/45" />
            </div>

            {/* L'arête diagonale, soulignée au néon comme sur la maquette. */}
            <div
              className="absolute inset-y-0 right-0 hidden w-[62%] lg:block"
              style={{
                clipPath: 'polygon(14% 0, 14.35% 0, 0.35% 100%, 0 100%)',
                background: 'linear-gradient(to bottom,#2fd8f5,#8b5cf6 55%,#f13fdc)',
                opacity: 0.75,
              }}
            />

            {/*
             * Le voile du téléphone.
             *
             * Les fondus ci-dessus sont **horizontaux** : ils protègent la
             * colonne de gauche, où le texte vit sur grand écran. Sous 1024 px
             * le texte occupe toute la largeur et passe donc sur la borne
             * éclairée — le sous-titre y devenait illisible. Un voile uniforme
             * garde l'atmosphère et rend le contraste.
             */}
            <div className="absolute inset-0 bg-[#070a14]/[0.72] lg:hidden" />

            {/* Quelques halos discrets côté gauche : sans eux le noir est plat
                et l'image a l'air posée sur un fond différent du sien. */}
            <div className="absolute left-[8%] top-[18%] h-56 w-56 rounded-full bg-neon-violet/[0.07] blur-[80px]" />
            <div className="absolute left-[26%] bottom-[14%] h-40 w-40 rounded-full bg-neon-cyan/[0.06] blur-[70px]" />
          </>
        ) : (
          <>
            {/*
             * La ville, en arrière-plan.
             *
             * Premier essai : quatre halos à 15-25 % d'opacité. Ils se sont
             * additionnés en un aplat magenta qui couvrait toute la moitié
             * droite — plus lumineux que la borne censée être le sujet. Un
             * néon ne se voit que sur du noir : le fond doit rester sombre à
             * 90 %, et la lumière être **ponctuelle**, pas ambiante.
             *
             * Les halos sont donc à moins de 10 %, plus petits, et un voile
             * sombre repasse par-dessus pour tenir la lisibilité du titre.
             */}
            <div className="absolute inset-0 bg-grille-neon bg-grille opacity-20" />
            <div className="absolute right-[8%] top-[12%] h-[300px] w-[300px] rounded-full bg-neon-violet/[0.10] blur-[80px]" />
            <div className="absolute right-[34%] top-[42%] h-48 w-48 rounded-full bg-neon-magenta/[0.08] blur-[70px]" />
            <div className="absolute right-[3%] bottom-[12%] h-56 w-56 rounded-full bg-neon-cyan/[0.07] blur-[70px]" />
            <div className="absolute right-[24%] bottom-[28%] h-24 w-24 rounded-full bg-neon-orange/[0.06] blur-[50px]" />
            {/* Le voile : il rend le noir au fond et garde le titre lisible. */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#070a14] via-[#070a14]/70 to-[#070a14]/45" />
          </>
        )}
      </div>

      {/* ── La borne, quand il n'y a pas de rendu ───────────────────────── */}
      {!aVisuel && (
        <BorneNeon className="pointer-events-none absolute bottom-0 right-[4%] hidden h-[92%] w-auto opacity-95 lg:block" />
      )}

      {/*
       * ── Le cadre biseauté qui tient l'accroche ────────────────────────
       *
       * Il est tracé en six segments, et pas avec la technique des deux
       * calques biseautés utilisée pour les panneaux. Cette technique suppose
       * un intérieur **opaque** : le dégradé du dessous n'est visible que sur
       * le pixel qui dépasse. Ici l'intérieur doit rester transparent pour
       * laisser voir le fond — le dégradé remplissait donc tout le héros
       * d'un lavis violet, plus lumineux que la borne censée en être le sujet.
       *
       * Quatre bords droits, qui s'arrêtent avant les angles coupés, et deux
       * diagonales de 23 px (16 × √2) pour les fermer.
       */}
      <div className="pointer-events-none absolute inset-x-4 inset-y-3 z-10" aria-hidden>
        <span className="absolute left-4 right-0 top-0 h-px bg-gradient-to-r from-neon-cyan/70 via-neon-violet/35 to-neon-magenta/60" />
        <span className="absolute bottom-4 right-0 top-0 w-px bg-gradient-to-b from-neon-magenta/60 to-neon-magenta/20" />
        <span className="absolute bottom-0 left-0 right-4 h-px bg-gradient-to-l from-neon-magenta/55 via-neon-violet/30 to-neon-cyan/50" />
        <span className="absolute bottom-0 left-0 top-4 w-px bg-gradient-to-t from-neon-cyan/45 to-neon-cyan/70" />
        <span className="absolute left-0 top-4 h-px w-[23px] origin-left -rotate-45 bg-neon-cyan/70" />
        <span className="absolute bottom-4 right-0 h-px w-[23px] origin-right rotate-45 bg-neon-magenta/60" />
      </div>

      <div className="relative z-20 mx-auto max-w-[1440px] px-6 pb-8 pt-9 lg:pb-10 lg:pt-11">
        {children}
      </div>

      {/* La conduite qui referme l'accroche par le bas, coudée dans l'autre
          sens que celle de l'en-tête : les deux encadrent le bloc. */}
      <Conduite className="absolute bottom-0 left-0 z-10 h-[17px] w-full -scale-x-100" />
    </section>
  );
}
