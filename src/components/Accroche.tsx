import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { BorneNeon } from './BorneNeon';
import { Conduite, ConduiteDecrochee } from './DecorNeon';

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
            {/*
             * ── Plein cadre, sans découpe ─────────────────────────────────
             *
             * Trois essais pour arriver ici, et les deux premiers sont
             * instructifs :
             *
             * · **Panneau clippé à 62 %** : arête franche, le héros se lisait
             *   comme deux blocs collés, et la borne tombait à 24 % de la
             *   largeur au lieu de 34 %.
             * · **Panneau + `scale(1.4)`** : la borne retrouvait sa taille
             *   mais sortait du panneau par la droite — coupée net.
             *
             * En plein cadre, `object-cover` cale l'image sur la largeur : la
             * borne se pose d'elle-même à 60→99 % de la page, très près des
             * 58→92 % de la référence, sans transformation. Le prix est un
             * recadrage vertical à 50 % — le rendu est en 16:9 pour un bloc
             * en 3,5:1, aucun cadrage ne peut éviter ça. On sacrifie le socle
             * et la couronne, jamais les rouleaux, qui sont le sujet.
             */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={VISUEL!}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: '68% 40%' }}
            />

            {/*
             * Le fondu vers la gauche, en trois arrêts explicites.
             *
             * Un `to-transparent` linéaire éclaircit déjà à 40 % de la
             * largeur, là où court le titre. Les arrêts calés à 0 / 46 / 78 %
             * gardent le noir franc sur toute la colonne de texte, puis
             * lâchent d'un coup — c'est ce qui donne l'impression d'une seule
             * image plutôt que d'un dégradé posé dessus.
             */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to right,#070a14 0%,#070a14 30%,rgba(7,10,20,0.88) 46%,rgba(7,10,20,0.35) 78%,rgba(7,10,20,0.15) 100%)',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070a14]/85 via-transparent to-[#070a14]/55" />

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

      <div className="relative z-20 mx-auto max-w-[1440px] px-6 pb-4 pt-9 lg:pb-5 lg:pt-11">
        {children}
      </div>

      {/* La conduite qui referme l'accroche par le bas, coudée dans l'autre
          sens que celle de l'en-tête : les deux encadrent le bloc. */}
      {/*
       * Sous 1024 px la barre de recherche occupe toute la largeur : il n'y a
       * plus de place à droite pour le palier bas, et le décrochement n'aurait
       * plus de sens. La conduite droite reprend la main.
       */}
      <Conduite className="absolute bottom-0 left-0 z-10 h-[17px] w-full -scale-x-100 lg:hidden" />
      <ConduiteDecrochee className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 hidden h-[92px] lg:block" />
    </section>
  );
}
