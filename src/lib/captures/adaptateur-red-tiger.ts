/**
 * L'adaptateur de capture de **Red Tiger** — et de NetEnt, qui est le même jeu
 * de plomberie sous un autre nom de domaine.
 *
 * Fichier séparé de `adaptateurs.ts` à dessein : plusieurs studios sont
 * instruits en parallèle, et la table `ADAPTATEURS` est le seul endroit où ils
 * se croisent. Le branchement s'y fait en deux lignes.
 *
 * ── Ce qui rend ce studio différent de tous les précédents ────────────────
 *
 * Pragmatic, BGaming, Hacksaw et Play'n GO peignent leur panneau de règles
 * dans un `<canvas>` : aucun sélecteur, rien que des coordonnées trouvées à
 * l'œil. **Red Tiger, non.** Le jeu tourne dans une application Vue (Vuetify)
 * dont les commandes sont du DOM ordinaire — `a.pays-button`, `a.help-button`,
 * `button.play-button`, `button.modal-close` — et le texte du panneau d'aide
 * est du texte HTML, lisible avec `innerText`.
 *
 * Conséquence : cet adaptateur **ne devine aucune coordonnée**. Il interroge,
 * il vérifie, et il ne clique que sur des rectangles que le jeu lui a donnés.
 * C'est la première fois que c'est possible, et c'est ce qui le rend court.
 *
 * ── Trois surcouches, et l'ordre dans lequel elles arrivent ───────────────
 *
 * La `demoUrl` en base est `https://redtiger.com/demo/<tableId>?showNavbar=true`,
 * c'est-à-dire la page **hôte** du studio, pas le jeu. Le jeu est trois étages
 * plus bas :
 *
 *   redtiger.com/demo/<tableId>        ← la page hôte (Next.js)
 *     └ fansite.evo-games.com/entry    ← le lanceur signé d'Evolution
 *         └ gserver-…/launcher/<Jeu>   ← le jeu, en DOM Vuetify
 *
 * On reste sur la page hôte du début à la fin. Naviguer directement sur
 * l'iframe `entry?params=…` a été essayé : **son jeton est à usage unique** et
 * l'ouvrir une seconde fois rend « User authentication failed or your session
 * may be expired. Error Code: EV.12 ». Il n'y a pas de raccourci.
 *
 * ── La porte d'âge ne se clique pas ───────────────────────────────────────
 *
 * La page hôte pose une modale « Yes, I'm 18 or older » par-dessus le jeu. Le
 * réflexe — cliquer le bouton — a été essayé trois fois et **casse la page** :
 * elle est remplacée par « There was an internal server error. », et la session
 * de démo est perdue avec elle. Le consentement déclenche un remontage de
 * l'iframe, donc un second lancement, que le serveur refuse.
 *
 * Ce qu'on fait à la place : masquer, en `display:none`, tout le mobilier
 * **fixe** de la page hôte — porte d'âge, bandeau cookies, bandeau « DEMO
 * MODE ». Un style en ligne ne déclenche aucune logique applicative, là où
 * retirer le nœud du DOM fait paniquer React. Vérifié à l'écran : le jeu
 * apparaît intact, et les clics passent jusqu'à lui.
 *
 * ── Le RTP est affiché, mais `lecture-regles.ts` ne sait pas encore le lire ──
 *
 * Le panneau HELP se termine, sur tous les jeux vus, par ce bloc :
 *
 *     Malfunction voids all pays and plays.
 *     RTP ≈ 95.72%
 *     The calculated max multiplier of the game is 1279.2.
 *     Minimum stake: 0.10
 *     Maximum stake: 500
 *
 * Quatre faits, en clair, et l'OCR les lit sans une faute — vérifié sur la
 * capture de 4SQUAD, qui rend « RTP = 95.72% » caractère pour caractère, la
 * valeur exacte de la base. Ce n'est donc **pas** une affaire de lisibilité.
 *
 * Ce qui bloque est ailleurs : `extraireLesFaits` exige le mot `theoretical`,
 * `maximum` ou `minimum` **devant** le sigle (`The theoretical RTP of this game
 * is …`), et Red Tiger écrit `RTP ≈`, tout nu. La lecture rend donc
 * `rtp: null`, comme chez Play'n GO, et la fiche garde son niveau de confiance
 * précédent — les captures, elles, sont publiées et valent par elles-mêmes.
 *
 * Ce n'est pas une fatalité : trois formulations à ajouter à
 * `lecture-regles.ts` (`RTP ≈ x%`, `calculated max multiplier … is x`,
 * `Minimum/Maximum stake: x`) débloqueraient le chiffre sur les 569 fiches des
 * deux studios. C'est un autre fichier, et donc un autre commit.
 *
 * ── La cadence, mesurée et payée ──────────────────────────────────────────
 *
 * Le lanceur d'Evolution sert **toutes** les démos Red Tiger et NetEnt depuis
 * un compte de démonstration unique (`casino_id=fansite000000001`), et il
 * compte. Relevé le 12/09/2026, sur une quinzaine d'ouvertures :
 *
 * · trois lancements en quatre minutes font passer `fansite.evo-games.com/entry`
 *   de 302 à **500** ;
 * · le ban dure un bon quart d'heure — quinze minutes de repos ont rendu
 *   l'accès, cinq n'ont rien rendu ;
 * · deux lancements simultanés passent, mais un troisième **cinq minutes plus
 *   tard** a suffi à rebannir. Le budget tient donc plutôt en « deux ou trois
 *   ouvertures par quart d'heure » qu'en un débit par minute.
 *
 * Pendant le ban, la page hôte reste parfaitement normale : c'est l'iframe qui
 * ne se peuple jamais, ce qui ressemble trait pour trait à un adaptateur cassé.
 * D'où `LimiteDeDebit` levée dès qu'on reconnaît la page de ban : continuer
 * dans un ban ne rapporte rien et le prolonge.
 *
 * `pauseEntreJeuxMs` vaut dix minutes, et il faut savoir ce que ça implique :
 * `capturer-jeux.ts` traite ses jeux **deux par deux** (`PARALLELE = 2`), donc
 * deux ouvertures toutes les dix minutes, soit une trentaine d'heures pour les
 * 348 fiches Red Tiger. Le seuil exact n'est pas publié et n'a pas été mesuré
 * finement — chaque mesure coûte un quart d'heure de repos — donc cette valeur
 * est une précaution, pas une science, et `--pause=` la remplace. Descendre à
 * `PARALLELE = 1` serait le vrai réglage : c'est une constante du runner, donc
 * un autre fichier et une décision à prendre ailleurs.
 *
 * ── Le navigateur doit avoir une tête, et ce n'est pas négociable ─────────
 *
 * `fansite.evo-games.com` est derrière Akamai Bot Manager (cookies `bm_s` et
 * `bm_so`), qui répond « Access Denied » à un Chromium sans tête. C'est établi :
 * avec `headless: true` le jeu ne se charge jamais, avec `headless: false` il
 * se charge sans aucune autre précaution — ni masquage de `navigator.webdriver`
 * (qui vaut `true` dans nos essais réussis), ni `--disable-blink-features`.
 *
 * Quiconque « simplifiera » en remettant le mode sans tête cassera toute la
 * campagne **sans aucun message** : les jeux tomberont en « panneau jamais
 * atteint » et repartiront en file indéfiniment. D'où `avecTete: true`, et la
 * fenêtre poussée hors de l'écran dans `ouvrirLeJeu` : le poste sert aussi à
 * travailler, et une fenêtre Chromium qui s'ouvre toutes les dix minutes
 * pendant trente heures est insupportable. macOS refuse de sortir une fenêtre
 * complètement du bureau — elle s'arrête à une quarantaine de pixels visibles —
 * c'est tout ce qu'on peut obtenir sans le mode sans tête.
 */
import sharp from 'sharp';
import type { Frame, Page } from 'playwright';
import type { Adaptateur } from './adaptateurs';
import { LimiteDeDebit } from './limite-de-debit';

/** Les deux domaines servis par la même plateforme Evolution. */
const DEMO_JOUABLE = /(redtiger|netent)\.com\/demo\//;

/**
 * Le cadre du jeu, reconnu à son chemin de lanceur.
 *
 * L'hôte varie (`gserver-evo-fansitecw0000000.redtiger.cash`), le segment
 * `/launcher/` non : c'est celui de la plateforme, partagé par les deux
 * studios.
 */
const CADRE_JEU = /\/launcher\//;

/** Les commandes du jeu, telles que l'application Vue les nomme. */
const TIROIR = 'aside.v-navigation-drawer';
const AIDE = 'a.help-button';
const GAINS = 'a.pays-button';
const DEMARRER = 'button.play-button';
const FERMER = 'button.modal-close';

/**
 * Ce que le serveur de démo affiche quand il ne veut plus de nous.
 *
 * Les trois formulations rencontrées, dans l'ordre où elles sont apparues :
 * l'erreur de la page hôte quand le remontage de l'iframe échoue, le message
 * du jeu quand sa session a été invalidée, et celui du lanceur quand on rejoue
 * un jeton déjà consommé. Aucune n'est réparable côté client.
 */
const PAGE_DE_BAN = /internal server error|logged out|authentication failed/i;

/**
 * La ligne qu'on vient chercher, et la seule.
 *
 * Le sigle est suivi d'un signe « environ » que l'OCR rendra comme il pourra ;
 * on ne s'en sert ici que pour savoir **où en est le défilement**, donc la
 * tolérance est large.
 */
const LIGNE_DU_RTP = /RTP\s*[≈~=:]/i;

/**
 * Masque le mobilier de la page hôte qui recouvre le jeu.
 *
 * Trois surcouches, qui n'arrivent pas en même temps : la porte d'âge dès la
 * seconde seconde, le bandeau cookies plus tard, le bandeau « DEMO MODE » en
 * même temps que le jeu. D'où l'appel en boucle pendant l'attente plutôt qu'un
 * appel unique — un seul passage laissait le bandeau cookies en travers du bas
 * de l'écran, là où sont justement PAYS et HELP.
 *
 * Deux critères, et il en fallait bien deux. Une surcouche **anonyme** (celle
 * de Radix, sans texte) n'est reconnaissable qu'à sa position `fixed` et à sa
 * taille plein écran. Une surcouche **nommée** se reconnaît à son texte, et
 * c'est heureux : le bandeau « DEMO MODE » est en `absolute`, pas en `fixed`.
 * La première version n'exigeait que `fixed` et le laissait donc en travers du
 * haut du jeu — il figure encore sur une capture « base » de la simulation.
 *
 * Les conteneurs qui portent l'iframe sont exclus explicitement : masquer l'un
 * d'eux masquerait le jeu.
 *
 * `pointer-events` est remis sur le `body` parce que Radix le neutralise tant
 * qu'il croit sa modale ouverte : sans ça, la porte d'âge masquée continue de
 * manger tous les clics, et on cliquerait dans le vide pendant tout le jeu.
 */
const DEGAGER_LHOTE = () => {
  let masques = 0;
  for (const element of Array.from(document.querySelectorAll('body *'))) {
    const noeud = element as HTMLElement;
    if (noeud.tagName === 'IFRAME' || noeud.querySelector('iframe')) continue;
    const style = getComputedStyle(noeud);
    if (style.display === 'none') continue;
    const boite = noeud.getBoundingClientRect();
    if (!boite.width || !boite.height) continue;
    const texte = (noeud.innerText ?? '').trim();
    /*
     * Le mobilier **nommé** est reconnu à son seul texte, sans condition de
     * position. La version précédente exigeait un positionnement non `static`
     * et laissait passer le bandeau « DEMO MODE » : son texte vit dans un
     * enfant statique, et son parent positionné porte aussi l'iframe, donc les
     * deux échappaient au filtre. Le bandeau figurait encore en travers du haut
     * de deux captures « base ».
     */
    const nommee = /18 or older|Cookie Policy|DEMO MODE/i.test(texte) && texte.length < 400;
    const anonyme =
      style.position === 'fixed' &&
      texte === '' &&
      boite.width >= innerWidth * 0.9 &&
      boite.height >= innerHeight * 0.9;
    if (nommee || anonyme) {
      noeud.style.setProperty('display', 'none', 'important');
      masques++;
    }
  }
  document.body.style.setProperty('pointer-events', 'auto', 'important');
  return masques;
};

const cadreDuJeu = (page: Page): Frame | undefined =>
  page.frames().find((cadre) => CADRE_JEU.test(cadre.url()));

/** Vrai quand la page hôte ou le jeu annonce que la session est finie. */
async function auBan(page: Page): Promise<boolean> {
  return page
    .evaluate((motif) => new RegExp(motif, 'i').test(document.body.innerText), PAGE_DE_BAN.source)
    .catch(() => false);
}

/** Vrai si la commande existe et est visible dans le cadre. */
const presente = (cadre: Frame, selecteur: string): Promise<boolean> =>
  cadre
    .locator(selecteur)
    .first()
    .isVisible({ timeout: 2_000 })
    .catch(() => false);

/**
 * Clique une commande du jeu.
 *
 * ── Pourquoi un localisateur et pas `page.mouse.click` ────────────────────
 *
 * La première version lisait le rectangle dans le cadre, y ajoutait le décalage
 * de l'iframe lu sur `document.querySelector('iframe')`, et cliquait à la
 * souris. Elle a raté le bouton PLAY sur les deux jeux de la simulation : la
 * capture « base » montrait l'affiche d'accueil au lieu des rouleaux, et le
 * carrousel des gains ne s'ouvrait pas puisque `a.pays-button` reste
 * `disabled` tant que le jeu n'a pas démarré.
 *
 * Le premier `<iframe>` de la page hôte n'est pas forcément celui du jeu — le
 * site en injecte d'autres — et un décalage faux déplace **tous** les clics
 * sans rien signaler. Playwright, lui, sait où est le cadre : il calcule le
 * point lui-même, attend que l'élément soit stable et cliquable, et **lève**
 * quand il ne l'est pas. C'est exactement l'inverse du mode d'échec qu'on vient
 * de payer : un clic manqué devient bruyant.
 *
 * Le délai est court à dessein. Un bouton absent est une information — l'écran
 * d'accueil est déjà fermé, le panneau déjà refermé — pas une panne : on ne
 * veut pas y perdre trente secondes par jeu.
 */
async function cliquer(cadre: Frame, selecteur: string): Promise<boolean> {
  return cadre
    .locator(selecteur)
    .first()
    .click({ timeout: 8_000 })
    .then(() => true)
    .catch(() => false);
}

/**
 * Empreinte de l'écran, pour savoir si une page du carrousel a tourné.
 *
 * Le carrousel des gains est peint dans le canvas : ses pages n'ont ni
 * identifiant ni numéro qu'on puisse lire. Ce qui les distingue, c'est l'image.
 *
 * ── Le recadrage décide de tout, et un premier choix a déjà échoué ────────
 *
 * Les pages d'un carrousel Red Tiger partagent **le même décor de fond** : la
 * rue, les enseignes, l'éclairage. Seul le bandeau central change — les
 * symboles et leurs multiplicateurs. Recadré large (140,110 sur 1000×570), le
 * décor écrase la mesure : deux pages pourtant entièrement différentes de
 * 4SQUAD ne sont séparées que de **7,9**, sous le seuil de 8. L'adaptateur en
 * concluait « le carrousel ne tourne plus » et s'arrêtait à la première page,
 * sur un jeu qui en compte **neuf**.
 *
 * Resserré sur le bandeau central, les deux mêmes pages sont à **19,2**. C'est
 * le seul endroit qui porte de l'information, donc le seul qu'il faut mesurer.
 */
async function empreinte(page: Page): Promise<Buffer> {
  return sharp(await page.screenshot())
    .extract({ left: 340, top: 280, width: 600, height: 420 })
    .grayscale()
    .resize(16, 16, { fit: 'fill' })
    .raw()
    .toBuffer();
}

function ecartMoyen(a: Buffer, b: Buffer): number {
  let total = 0;
  for (let i = 0; i < a.length; i++) total += Math.abs(a[i] - b[i]);
  return total / a.length;
}

/** 19,2 entre deux pages du carrousel, moins de 5 quand rien n'a bougé. */
const SEUIL_A_BOUGE = 8;

export const RED_TIGER: Adaptateur = {
  studio: 'red-tiger',

  /** La page produit `redtiger.com/games/<slug>` n'est pas un jeu : on l'écarte. */
  demoExploitable: (url) => DEMO_JOUABLE.test(url),

  /** Akamai refuse le mode sans tête. Voir l'en-tête du fichier. */
  avecTete: true,

  /** Trois lancements en quatre minutes suffisent à se faire bannir. */
  pauseEntreJeuxMs: 600_000,

  /**
   * Trois secondes, et non trente.
   *
   * Ce délai est consommé par `capturer-jeux.ts` sur la `demoUrl`, c'est-à-dire
   * sur la page hôte du studio — un document Next.js prêt en moins de deux
   * secondes. Le jeu, lui, met de **3 à 60 secondes** à apparaître selon
   * l'humeur du lanceur : neuf essais ont donné 3,5 s, 4,5 s, 30,6 s et 60,7 s.
   * Un chronomètre fixe serait donc soit trois fois trop long, soit dix fois
   * trop court — d'où l'attente active dans `ouvrirLeJeu`, qui est le seul
   * endroit qui sache ce qu'il attend.
   */
  chargementMs: 3_000,

  /**
   * Dégage la page hôte, attend le jeu, et ferme le carrousel d'accueil.
   *
   * ── Pourquoi fermer l'accueil ici et pas plus tard ──────────────────────
   *
   * L'écran d'accueil de Red Tiger **est** la première page du carrousel des
   * gains : même cadre, mêmes flèches, même bouton PLAY au centre. Tant qu'il
   * est là, `a.pays-button` porte l'attribut `disabled` et la capture « base »
   * du runner montrerait une affiche promotionnelle au lieu des rouleaux.
   *
   * PLAY ne lance aucun tour : il referme le carrousel et révèle le jeu au
   * repos, solde à 1 000,00. Vérifié à l'écran — la capture de base montre la
   * grille garnie, immobile.
   */
  async ouvrirLeJeu(page) {
    /*
     * La fenêtre part hors du bureau.
     *
     * On ne peut pas passer `--window-position` : les arguments de lancement
     * appartiennent au runner, qui ouvre un seul navigateur pour toute la
     * campagne. CDP le fait après coup, ce qui revient au même à une seconde
     * près. macOS ramène la fenêtre à une quarantaine de pixels visibles au
     * lieu de l'effacer complètement : c'est une limite du système, pas un
     * réglage à corriger.
     */
    await page
      .context()
      .newCDPSession(page)
      .then(async (cdp) => {
        const { windowId } = (await cdp.send('Browser.getWindowForTarget')) as {
          windowId: number;
        };
        await cdp.send('Browser.setWindowBounds', {
          windowId,
          bounds: { left: -2400, top: -2400 },
        });
      })
      .catch(() => {
        /* Sans CDP la fenêtre reste visible : gênant, jamais bloquant. */
      });

    /*
     * Soixante-quinze secondes d'attente active, et un dégagement à chaque
     * tour. Les trois surcouches de l'hôte n'arrivent pas ensemble, et le jeu
     * peut apparaître à n'importe quel moment de cette fenêtre.
     */
    for (let seconde = 0; seconde < 75; seconde++) {
      await page.evaluate(DEGAGER_LHOTE).catch(() => 0);
      if (cadreDuJeu(page)) break;
      if (await auBan(page)) throw new LimiteDeDebit('fansite.evo-games.com');
      await page.waitForTimeout(1_000);
    }
    const cadre = cadreDuJeu(page);
    if (!cadre) throw new LimiteDeDebit('fansite.evo-games.com');

    /*
     * Le cadre existe bien avant d'être peint : le lanceur affiche d'abord le
     * logo Red Tiger sur fond noir. Le bouton PLAY est le témoin qu'on attend —
     * il n'apparaît qu'une fois le jeu chargé, et c'est lui qui dit quand on
     * peut agir. Trente secondes de marge : le cadre est apparu entre 3 et 60 s
     * selon les essais, le contenu suit de cinq à quinze.
     */
    for (let essai = 0; essai < 20 && !(await presente(cadre, DEMARRER)); essai++) {
      await page.evaluate(DEGAGER_LHOTE).catch(() => 0);
      if (await auBan(page)) throw new LimiteDeDebit('fansite.evo-games.com');
      await page.waitForTimeout(1_500);
    }

    /*
     * PLAY, et **on vérifie qu'il a pris**.
     *
     * L'écran d'accueil de Red Tiger est la première page du carrousel des
     * gains : tant qu'il est là, `a.pays-button` porte `disabled` et la capture
     * « base » du runner montre une affiche promotionnelle au lieu des
     * rouleaux. C'est exactement ce qui est arrivé sur 10 001 Nights lors de la
     * simulation, sans qu'aucune ligne du journal ne le dise — le jeu a suivi
     * tout son parcours sur l'écran d'accueil.
     *
     * Le témoin de la réussite est la **disparition** du bouton, pas le clic :
     * un clic rendu par Playwright peut atterrir pendant l'animation d'entrée
     * du carrousel, qui l'avale. Trois essais, parce qu'on en a vu échouer un.
     */
    for (let essai = 0; essai < 3 && (await presente(cadre, DEMARRER)); essai++) {
      await cliquer(cadre, DEMARRER);
      await page.waitForTimeout(3_500);
    }
    // Le bandeau « DEMO MODE » se pose par-dessus le jeu une fois celui-ci
    // lancé : un dernier dégagement, sinon il s'invite dans toutes les captures.
    await page.evaluate(DEGAGER_LHOTE).catch(() => 0);
    await page.waitForTimeout(1_500);

    /*
     * Le tiroir MENU, s'il s'est ouvert tout seul.
     *
     * Observé sur 4SQUAD : la capture « base » montrait le tiroir déployé,
     * recouvrant le tiers droit du jeu — rouleaux coupés, bouton de tour
     * caché. Rien dans cet adaptateur ne clique le bouton qui l'ouvre, et la
     * cause n'a pas été identifiée ; ce qu'on sait, c'est qu'il **est** parfois
     * là, et qu'une capture de base amputée part sur la fiche.
     *
     * On ne cherche donc pas à l'éviter, on vérifie. Le tiroir vit replié à
     * x≈1415, hors du cadre de 1 280 px : s'il déborde dans la fenêtre, c'est
     * qu'il est ouvert, et sa propre croix le referme.
     */
    const tiroirOuvert = await cadre
      .evaluate((sel) => {
        const aside = document.querySelector(sel) as HTMLElement | null;
        return aside ? aside.getBoundingClientRect().x < 1280 : false;
      }, TIROIR)
      .catch(() => false);
    if (tiroirOuvert) {
      await cliquer(cadre, `${TIROIR} ${FERMER}`);
      await page.waitForTimeout(1_500);
    }
  },

  /**
   * Le panneau HELP, puis le carrousel des gains.
   *
   * ── Pourquoi HELP d'abord ───────────────────────────────────────────────
   *
   * `capturer-jeux.ts` refuse de publier un jeu dont aucune capture ne porte
   * `EN_TETE_PANNEAU` (`/RTP|GAME RULES|PAYTABLE/i`) et le remet en file. Or le
   * carrousel des gains n'écrit aucun de ces trois mots : il montre des
   * symboles, des multiplicateurs et le nom des fonctions. Seul le bas du
   * panneau HELP porte « RTP ≈ 95.72% ».
   *
   * Sans lui, tout le catalogue Red Tiger serait rechargé à chaque campagne
   * pour échouer au même endroit — le piège déjà payé chez Pragmatic avec les
   * classiques historiques, et chez Play'n GO avec sa table de gains muette.
   * D'où l'ordre : HELP d'abord, il est la preuve ; les gains ensuite, ils sont
   * l'illustration.
   */
  async capturerLesRegles(page, cliche) {
    const cadre = cadreDuJeu(page);
    if (!cadre) return 0;

    let prises = 0;

    /*
     * Un écran d'accueil encore ouvert est la panne la plus probable ici : le
     * jeu n'a pas fini de charger quand `ouvrirLeJeu` a cliqué. On lui redonne
     * sa chance plutôt que d'abandonner — sans quoi la fiche repart en file
     * pour un rechargement complet, chez un studio qui compte nos lancements.
     */
    if (await presente(cadre, DEMARRER)) {
      await cliquer(cadre, DEMARRER);
      await page.waitForTimeout(3_000);
    }

    /**
     * Amène une partie du règlement à l'écran, en pilotant son ascenseur.
     *
     * ── La molette ne suffit pas, et l'ascenseur oui ────────────────────────
     *
     * La première version posait le curseur au milieu du panneau et envoyait
     * `mouse.wheel(0, 600)`. Sur 4SQUAD, dont le règlement est court, ça
     * marchait. Sur 10 001 Nights Megaways, **les deux premiers crans ont
     * défilé et les huit suivants n'ont rien fait** : le panneau s'est figé au
     * milieu, le RTP n'a jamais été photographié, et le jeu est reparti en file
     * avec la mention « panneau de règles jamais atteint » — le diagnostic d'un
     * adaptateur cassé. La molette traverse deux iframes imbriquées ; le
     * panneau, lui, est du DOM qu'on pilote directement.
     *
     * L'ascenseur est cherché par le **plus grand débordement** du cadre, et
     * non en remontant de parent en parent depuis une ligne : cette version-là
     * s'arrêtait au premier ancêtre qui dépassait de quelques pixels, déjà « en
     * bas », et concluait qu'il n'y avait plus rien à faire dès la première vue.
     * Le règlement est de loin le plus haut conteneur qui déborde d'un jeu Red
     * Tiger : le prendre au maximum ne laisse pas de place au doute.
     *
     * `scrollTop` est écrit **et vérifié** : c'est exactement ce que
     * l'adaptateur BGaming a trouvé inopérant sur *son* panneau, donc la
     * question se pose à chaque studio et ne se suppose jamais.
     */
    const placer = (cible: 'bas' | RegExp) =>
      cadre
        .evaluate(
          ({ motif }) => {
            let boite: HTMLElement | null = null;
            let debordement = 50;
            for (const e of Array.from(document.querySelectorAll('*'))) {
              const h = e as HTMLElement;
              const ecart = h.scrollHeight - h.clientHeight;
              if (ecart > debordement && h.clientHeight > 100) {
                debordement = ecart;
                boite = h;
              }
            }
            if (!boite) return false;

            const avant = boite.scrollTop;
            if (motif === null) {
              // Un pas démesuré tombe en bas : le navigateur borne `scrollTop`
              // de lui-même, ce qui évite un cas particulier à écrire.
              boite.scrollTop = avant + 10_000_000;
            } else {
              /*
               * La phrase est cherchée dans les **nœuds de texte**, pas dans
               * les éléments sans enfants.
               *
               * Le règlement est écrit en blocs séparés par des `<br>` : le
               * paragraphe visé vit dans un élément qui a donc des enfants, et
               * le filtre « élément feuille » n'en trouvait aucun. Mesuré sur
               * 4SQUAD : zéro feuille, **trois** nœuds de texte. Le panneau
               * restait au bas où la vue précédente l'avait laissé, et la
               * seconde capture doublonnait la première — le garde-fou de
               * publication n'a donc jamais vu le mot qu'il cherche, et la
               * fiche est repartie en file.
               *
               * Un `Range` donne la position de la ligne elle-même, alors que
               * le rectangle du bloc parent pointerait son début, plusieurs
               * écrans plus haut.
               */
              const regle = new RegExp(motif, 'i');
              const marcheur = document.createTreeWalker(boite, NodeFilter.SHOW_TEXT);
              let noeud: Node | null = null;
              while ((noeud = marcheur.nextNode())) {
                if (regle.test(noeud.textContent ?? '')) break;
              }
              if (!noeud) return false;
              const zone = document.createRange();
              zone.selectNode(noeud);
              boite.scrollTop =
                avant + zone.getBoundingClientRect().top - boite.getBoundingClientRect().top;
            }
            return boite.scrollTop !== avant || motif !== null;
          },
          { motif: cible === 'bas' ? null : cible.source },
        )
        .catch(() => false);

    /* ── 1. Le bas du règlement : la seule vue qui porte un chiffre ───────── */
    if (!(await cliquer(cadre, AIDE))) return 0;
    await page.waitForTimeout(4_500);

    /*
     * Le panneau est du HTML : on lui demande directement s'il est là, plutôt
     * que de le reconnaître par OCR. C'est le premier studio où c'est possible,
     * et ça supprime d'un coup toute la classe de pannes « le clic a manqué,
     * on a capturé sept fois le jeu de base ».
     */
    const ouvert = await cadre
      .evaluate((motif) => new RegExp(motif, 'i').test(document.body.innerText ?? ''), LIGNE_DU_RTP.source)
      .catch(() => false);
    if (!ouvert) {
      if (await auBan(page)) throw new LimiteDeDebit('fansite.evo-games.com');
      /*
       * On rend 0, pas `SANS_PANNEAU` : les habillages Red Tiger rencontrés
       * portent tous le même panneau HELP. Un échec ici veut dire qu'on n'a
       * pas su l'ouvrir, pas qu'il n'existe pas — et `SANS_PANNEAU` est une
       * affirmation irréversible, qui retire le jeu de la file pour toujours.
       */
      return 0;
    }

    /*
     * ── Pourquoi le bas du règlement passe en premier ──────────────────────
     *
     * `capturer-jeux.ts` écarte les captures qui se ressemblent, sur une
     * empreinte 16×16 en niveaux de gris de la colonne centrale. Cette mesure
     * est taillée pour les panneaux graphiques de Pragmatic ; le règlement de
     * Red Tiger, lui, est du texte clair sur un fond flou uniforme, et deux
     * pages **entièrement différentes** n'y sont séparées que de 6,6 — pour un
     * seuil de rejet à 6. Mesuré sur 4SQUAD : sept vues prises, trois gardées,
     * et la vue jetée au milieu du lot était précisément celle qui portait
     * « RTP ≈ 95.72% ».
     *
     * La première capture, elle, n'a pas de précédente : le tri la garde
     * toujours. On y met donc ce qui compte.
     */
    await placer('bas');
    await page.waitForTimeout(1_200);
    await cliche(`regles-${++prises}`);

    /*
     * ── Et pourquoi le carrousel s'intercale avant la seconde vue du texte ──
     *
     * Le garde-fou de publication exige qu'une capture porte `RTP`,
     * `GAME RULES` ou `PAYTABLE` dans les **1 200 premiers caractères** de son
     * OCR. Sur la vue ci-dessus, l'OCR lit parfaitement « RTP = 95.72% » — mais
     * au caractère **1 299**, quatre-vingt-dix-neuf trop loin : le panneau
     * déroule un long texte réglementaire avant d'énoncer le chiffre.
     *
     * Le mot arrive en revanche très tôt sur la vue du paragraphe « …advertised
     * in the paytable », qui est du texte standard Red Tiger. Il faut donc
     * **deux** vues du règlement, et les deux doivent survivre au tri. Entre
     * deux pages de texte l'écart est de 6,6 ; entre une page de texte et une
     * page du carrousel, de 28,4. On intercale donc le carrousel : chaque
     * capture se retrouve voisine d'une image qui ne lui ressemble pas, et le
     * tri les garde toutes.
     */
    await cliquer(cadre, `${FERMER}:visible`);
    await page.waitForTimeout(2_000);

    /* ── 2. Le carrousel des gains ───────────────────────────────────────── */
    if (await cliquer(cadre, GAINS)) {
      await page.waitForTimeout(4_500);

      /*
       * La flèche « page suivante », désignée par sa **place à l'écran**.
       *
       * Elle n'a ni classe ni texte qui la distingue de sa jumelle : ce sont
       * deux `v-btn` transparents posés de part et d'autre du bouton PLAY. La
       * première version les cherchait par la parenté — `following-sibling` de
       * PLAY — et n'a rien trouvé : chaque bouton est enveloppé dans son propre
       * conteneur, donc ils ne sont pas frères. L'adaptateur en a conclu « une
       * seule page de gains » et s'est arrêté après la première, sur un jeu qui
       * en a plusieurs.
       *
       * Ce qui est vrai de la mise en page, en revanche, l'est sur tous les
       * habillages vus : la flèche suivante est le bouton posé à la même
       * hauteur que PLAY et à sa droite. On le repère par son rang parmi les
       * boutons du cadre, puis on laisse Playwright cliquer — le rang traverse
       * l'iframe, la coordonnée non.
       */
      const rang = await cadre
        .evaluate((sel) => {
          const play = document.querySelector(sel) as HTMLElement | null;
          if (!play) return -1;
          const ancre = play.getBoundingClientRect();
          return Array.from(document.querySelectorAll('button')).findIndex((b) => {
            const r = b.getBoundingClientRect();
            return (
              r.width > 0 &&
              r.x > ancre.right &&
              r.x < 1280 &&
              Math.abs(r.y + r.height / 2 - (ancre.y + ancre.height / 2)) < 40
            );
          });
        }, DEMARRER)
        .catch(() => -1);

      /*
       * Six pages au plus, et on s'arrête dès que l'écran ne bouge plus.
       *
       * Le carrousel **boucle** : passé la dernière page, la flèche ramène à
       * la première, et le tri des doublons la jetterait — mais après l'avoir
       * écrite, convertie et comptée. La comparaison d'images arrête la boucle
       * au bon endroit, et à la page près.
       *
       * Le plafond est un choix éditorial, pas une limite technique : 4SQUAD
       * compte **neuf** pages de gains, et une fiche qui en publierait neuf,
       * plus le règlement, noierait le jeu sous sa propre documentation.
       */
      const PAGES_MAX = 6;
      let precedente = await empreinte(page);
      await cliche(`regles-${++prises}`);
      if (rang >= 0) {
        const fleche = cadre.locator('button').nth(rang);
        for (let vue = 1; vue < PAGES_MAX; vue++) {
          const clique = await fleche
            .click({ timeout: 8_000 })
            .then(() => true)
            .catch(() => false);
          if (!clique) break;
          await page.waitForTimeout(2_200);
          const actuelle = await empreinte(page);
          if (ecartMoyen(precedente, actuelle) < SEUIL_A_BOUGE) break;
          precedente = actuelle;
          await cliche(`regles-${++prises}`);
        }
      }
      // PLAY referme le carrousel et rend le jeu.
      await cliquer(cadre, DEMARRER);
      await page.waitForTimeout(2_000);
    }

    /* ── 3. Le règlement, à la page qui nomme la table de gains ──────────── */
    if (await cliquer(cadre, AIDE)) {
      await page.waitForTimeout(4_000);
      /*
       * Le paragraphe visé est du texte standard de la plateforme, pas une
       * phrase propre à un jeu : il est présent mot pour mot sur 4SQUAD comme
       * sur 10 001 Nights Megaways. S'il manquait, la vue du haut du panneau
       * fait un repli honnête — elle documente, même si elle ne prouve rien.
       */
      if (!(await placer(/advertised in the paytable/i))) await placer(/paytable/i);
      await page.waitForTimeout(1_200);
      await cliche(`regles-${++prises}`);
      if (!(await cliquer(cadre, `${FERMER}:visible`))) await page.keyboard.press('Escape');
      await page.waitForTimeout(1_500);
    }

    return prises;
  },

  /**
   * Red Tiger ne vend pas de fonction bonus dans les démos de son site.
   *
   * Vérifié sur les jeux ouverts : la barre de commandes n'expose que la mise,
   * AUTO, TURBO et le tour — aucun bouton d'achat, et le panneau HELP, qui
   * décrit pourtant chaque commande jusqu'au TURBO SPIN, n'en mentionne aucun.
   *
   * On rend donc `false` sans cliquer. Chercher à l'aveugle produirait une
   * image du jeu de base légendée « Buying the feature » — la faute que le
   * contrôle `/BUY/i` de l'adaptateur Pragmatic existe précisément pour
   * empêcher.
   *
   * Si un habillage à achat apparaît, il sera facile à brancher **et à
   * vérifier** : contrairement aux quatre studios précédents, le bouton sera un
   * vrai élément du DOM, donc `viser` saura dire s'il existe avant qu'on
   * clique. C'est ici qu'il faudra poser la question, pas un clic de plus.
   */
  async capturerLAchat() {
    return false;
  },
};
