/**
 * L'adaptateur de capture du studio **1spin4win**.
 *
 * Il vit dans son propre fichier plutôt que dans `adaptateurs.ts` : plusieurs
 * studios se câblent en parallèle, et un fichier commun aurait fait de chaque
 * ajout un conflit. Le branchement se fait dans la table `ADAPTATEURS`.
 *
 * ── Ce que 1spin4win a de confortable ─────────────────────────────────────
 *
 * La `demoUrl` en base **est** le jeu : un lanceur sans jeton, sans portail
 * 18+, sans Cloudflare. Deux écritures coexistent et se valent —
 * `gmh5/games.html?game=BookOfNibiru&…` (181 fiches), qui redirige en 301 vers
 * `gmh5/bookofnibiru.html?…` (45 fiches la portent déjà). D'où un
 * `demoExploitable` qui regarde le dossier `/gmh5/` et pas le nom du fichier.
 *
 * Vérifié à l'image, pas seulement au code HTTP : la page servie est bien un
 * jeu jouable, rouleaux compris. C'est le contrôle que le lanceur Wazdan a
 * rendu obligatoire — lui rend sa fiche marketing dès que l'User-Agent
 * contient « Headless », sans que rien n'échoue. Ici Chromium **sans tête**
 * reçoit le jeu : aucune réécriture d'en-tête n'est nécessaire, et aucune
 * fenêtre n'est ouverte sur le poste.
 *
 * ── Ce qu'il a de pénible : rien n'est à une position fixe ────────────────
 *
 * Tout est peint dans un `<canvas>` de 1280×719, sans le moindre DOM à
 * interroger — mesuré : `document.body.innerText` est vide, et le seul global
 * exploitable (`window.Game`) n'existe que sur une partie du catalogue, absent
 * par exemple de Cash the Gold. On ne peut donc **rien** demander au jeu.
 *
 * Et les coordonnées, elles, ne sont pas stables d'un jeu à l'autre : le
 * cadre du panneau de règles suit l'habillage, si bien que sa flèche « page
 * suivante » est à (1106, 577) sur Book of Nibiru, (1093, 600) sur Cash the
 * Gold et (1111, 591) sur Booming Fruits 27. Une coordonnée fixe rate donc
 * une partie du catalogue **en silence** — la panne exacte que l'adaptateur
 * Pragmatic a payée sur son icône « i ».
 *
 * D'où le parti pris de ce fichier : **deux ancres fixes, tout le reste
 * mesuré à l'image**. Les ancres sont les seuls éléments vérifiés identiques
 * sur les vingt-deux habillages reconnus, parce qu'ils appartiennent au
 * lanceur et non au jeu — le bouton « CONTINUE » de l'écran d'accueil et
 * l'icône « i » de la barre du bas. Les deux boutons qui bougent — la flèche du panneau, la
 * pastille « BONUS » — sont retrouvés en cherchant leur tache blanche.
 */
import sharp from 'sharp';
import type { Page } from 'playwright';
import type { Adaptateur } from './adaptateurs';

/**
 * L'icône « i » de la barre du bas : **ouvre et referme** le panneau.
 *
 * C'est un interrupteur, vérifié à l'écran : un second clic au même endroit
 * remet le jeu de base. Échap, lui, ne ferme rien du tout — essayé, le
 * panneau reste ouvert, et `capturerLAchat` aurait alors cliqué dans la table
 * de gains en croyant acheter un bonus.
 */
const INFO = { x: 148, y: 727 };

/** Le bouton de l'écran d'accueil, au centre, juste au-dessus du bas de page. */
const CONTINUER = { x: 640, y: 709 };

/**
 * Le bouton de l'écran d'accueil, reconnu à sa **forme** et non à sa couleur.
 *
 * ── La couleur a été essayée, et elle est fausse ───────────────────────────
 *
 * Première version : le bouton est RGB(159, 35, 22) uni, mesuré identique sur
 * Book of Nibiru, Cash the Gold, Booming Fruits 27 et All Ways Egypt. Il ne
 * l'est pas : Lucky Clover 27 le peint **en vert**, Fruit Cafe 20 **en bleu**,
 * Lucky 100 Bells dans un rouge plus clair — le lanceur l'accorde au thème du
 * jeu. Sur ces trois-là le témoin rendait « pas d'accueil », le clic n'était
 * jamais donné, et la campagne photographiait l'écran d'accueil en croyant
 * filmer le jeu. Trois jeux sur douze, sans une erreur.
 *
 * Ce qui, lui, ne change pas, c'est le dessin : un liseré clair d'un pixel à
 * y=680, puis une plage **parfaitement unie** de 340 px de large en dessous.
 * On exige les deux ensemble : le liseré uniforme, gris (les trois canaux
 * égaux) et clair, et la plage unie. Mesuré sur les douze jeux d'un
 * échantillon régulier du catalogue, aucun écran de jeu ni aucun panneau
 * ouvert ne présente cette paire — le plus proche a un liseré d'une étendue de
 * 12, quand l'accueil est toujours à 0.
 *
 * Ce témoin n'est pas un confort, il évite un clic à l'aveugle : sur un jeu
 * déjà ouvert, (640, 709) tombe sur un **bouton de mise** de la barre du bas.
 * Le tour ne partirait pas — 1spin4win lance par le bouton rond ou par la
 * barre d'espace — mais la capture « jeu de base » afficherait une mise que
 * personne n'a choisie. Espace, justement, n'est jamais pressé ici : sur un
 * jeu sans écran d'accueil il lancerait un tour et la capture montrerait des
 * rouleaux en mouvement.
 */
const LISERE_ACCUEIL = { left: 470, top: 680, width: 340, height: 1 };
const PLAGE_ACCUEIL = { left: 470, top: 687, width: 340, height: 8 };

/**
 * Le coin bas-droit du panneau, là où vit la flèche « page suivante ».
 *
 * La fenêtre est volontairement étroite : à sa gauche se trouvent le numéro de
 * page (« 1/5 ») et la flèche « précédente », et cliquer cette dernière
 * ferait défiler les pages **à l'envers** — un changement d'image, donc un
 * faux positif que la vérification ne rattraperait pas.
 */
const COIN_FLECHE = { left: 1066, top: 545, width: 84, height: 90 };

/**
 * La colonne de gauche, là où vit la pastille « BONUS » quand le jeu en a une.
 *
 * Elle est posée contre le bord gauche des rouleaux, à mi-hauteur : (58, 368)
 * sur Cash the Gold, (48, 355) sur All Ways Egypt. Book of Nibiru et Booming
 * Fruits 27 n'en ont pas, et la fenêtre y reste vide — c'est ce silence qui
 * sert de réponse à « ce jeu vend-il sa fonction ? ».
 */
const COLONNE_BONUS = { left: 14, top: 280, width: 96, height: 180 };

/** Un pixel « blanc » d'habillage : les trois canaux hauts ensemble. */
const BLANC = 190;

/**
 * Le plus grand carré dans lequel un bouton rond tient encore.
 *
 * Les disques mesurés font de 20 à 44 px de côté selon l'habillage. Cinquante
 * laisse de la marge sans jamais laisser passer un liseré de cadre, qui
 * traverse la fenêtre de recherche sur toute sa largeur ou sa hauteur.
 */
const COTE_BOUTON = 50;

/** En dessous, c'est un reflet du décor et non un bouton. */
const PIXELS_MIN = 15;

/**
 * Le centre du bouton rond clair d'une fenêtre, ou `null`.
 *
 * ── Trois versions, et ce que chacune a raté ──────────────────────────────
 *
 * 1. **La moyenne des pixels clairs de la fenêtre.** Elle donnait (1076, 601)
 *    sur Book of Nibiru pour une flèche réellement à (1106, 577) : le bord
 *    doré du cadre et les chiffres du numéro de page tiraient le point hors du
 *    bouton.
 * 2. **La plus grosse tache d'un seul tenant.** Elle réglait Book of Nibiru et
 *    trois autres, puis Fruit Cafe 20 est arrivé : son panneau est cerné d'un
 *    néon blanc qui traverse la fenêtre, et ce liseré pèse plus lourd que le
 *    bouton. Le clic tombait sur le cadre, la page ne tournait pas, et la
 *    boucle s'arrêtait à la première page d'un panneau qui en annonce cinq.
 * 3. **La plus grosse tache *compacte*.** Un bouton tient dans un carré d'une
 *    cinquantaine de pixels ; un liseré, jamais — il traverse la fenêtre de
 *    part en part. On écarte donc par la **forme** avant de comparer les
 *    tailles, ce qui laisse le disque gagner même quand il est plus petit que
 *    le décor qui l'entoure.
 *
 * Le plancher de pixels est bas — quinze — parce que l'habillage teinte aussi
 * ses flèches : Lucky Clover 27 n'en peint que quarante-deux au-dessus du
 * seuil de clarté, là où Cash'n Fruits 27 en a deux cents. Un plancher haut
 * les aurait rendues introuvables, et le prix d'un plancher bas est nul : un
 * clic sur un reflet ne fait rien, et la page non tournée arrête la boucle
 * exactement comme une flèche absente.
 */
async function tacheBlanche(
  page: Page,
  fenetre: { left: number; top: number; width: number; height: number },
): Promise<{ x: number; y: number } | null> {
  const { data, info } = await sharp(await page.screenshot())
    .extract(fenetre)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const largeur = info.width;
  const hauteur = info.height;
  const clair = new Uint8Array(largeur * hauteur);
  for (let p = 0, i = 0; p < largeur * hauteur; p++, i += info.channels) {
    if (data[i] > BLANC && data[i + 1] > BLANC && data[i + 2] > BLANC) clair[p] = 1;
  }

  const vu = new Uint8Array(largeur * hauteur);
  const pile: number[] = [];
  let meilleure: { n: number; sx: number; sy: number } | null = null;
  for (let depart = 0; depart < largeur * hauteur; depart++) {
    if (!clair[depart] || vu[depart]) continue;
    pile.length = 0;
    pile.push(depart);
    vu[depart] = 1;
    let n = 0;
    let sx = 0;
    let sy = 0;
    let xMin = largeur;
    let xMax = 0;
    let yMin = hauteur;
    let yMax = 0;
    while (pile.length) {
      const p = pile.pop()!;
      const x = p % largeur;
      const y = (p / largeur) | 0;
      n++;
      sx += x;
      sy += y;
      if (x < xMin) xMin = x;
      if (x > xMax) xMax = x;
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
      const voisins = [
        x > 0 ? p - 1 : -1,
        x < largeur - 1 ? p + 1 : -1,
        y > 0 ? p - largeur : -1,
        y < hauteur - 1 ? p + largeur : -1,
      ];
      for (const q of voisins) if (q >= 0 && clair[q] && !vu[q]) { vu[q] = 1; pile.push(q); }
    }
    const compacte = xMax - xMin <= COTE_BOUTON && yMax - yMin <= COTE_BOUTON;
    if (n >= PIXELS_MIN && compacte && n > (meilleure?.n ?? 0)) meilleure = { n, sx, sy };
  }

  if (!meilleure) return null;
  return {
    x: Math.round(fenetre.left + meilleure.sx / meilleure.n),
    y: Math.round(fenetre.top + meilleure.sy / meilleure.n),
  };
}

/** L'étendue (max − min) et la moyenne de chaque canal d'une fenêtre. */
async function teinte(
  cliche: Buffer,
  fenetre: { left: number; top: number; width: number; height: number },
): Promise<{ etendue: number; moyennes: number[] }> {
  const { data, info } = await sharp(cliche)
    .extract(fenetre)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const min = [255, 255, 255];
  const max = [0, 0, 0];
  const somme = [0, 0, 0];
  // Le pas suit `info.channels` et non 3 : un cliché à canal alpha décalerait
  // silencieusement la lecture d'un pixel sur quatre, et le témoin d'accueil
  // deviendrait faux sans rien signaler.
  for (let i = 0; i < data.length; i += info.channels) {
    for (let c = 0; c < 3; c++) {
      const v = data[i + c];
      if (v < min[c]) min[c] = v;
      if (v > max[c]) max[c] = v;
      somme[c] += v;
    }
  }
  const n = data.length / info.channels;
  return {
    etendue: Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]),
    moyennes: somme.map((v) => v / n),
  };
}

/** Vrai tant que l'écran d'accueil — ou son écran de chargement — est affiché. */
async function accueilAffiche(page: Page): Promise<boolean> {
  const cliche = await page.screenshot();
  const lisere = await teinte(cliche, LISERE_ACCUEIL);
  const plage = await teinte(cliche, PLAGE_ACCUEIL);
  const grisDuLisere = Math.max(...lisere.moyennes) - Math.min(...lisere.moyennes);
  return (
    lisere.etendue <= 4 &&
    grisDuLisere <= 8 &&
    Math.min(...lisere.moyennes) >= 100 &&
    plage.etendue <= 6
  );
}

/**
 * Empreinte du centre de l'écran, pour décider si un clic a fait quelque chose.
 *
 * Tout étant peint dans le canvas, l'OCR ne peut pas servir de témoin ici : la
 * bande haute d'un jeu 1spin4win rend « moos ENR ET — » sur un panneau
 * pourtant grand ouvert, et « ronnie RUV » là où l'écran affiche « BONUS BUY ».
 * On ne s'appuie donc sur aucun mot, et surtout pas sur « RTP », que le moteur
 * lit une fois sur deux selon le fond du jeu.
 *
 * Ce qu'on mesure à la place est sans ambiguïté : le panneau couvre les
 * rouleaux, donc le centre de l'écran change en grand ; un clic tombé à côté
 * ne change rien.
 */
async function empreinte(page: Page): Promise<Buffer> {
  return sharp(await page.screenshot())
    .extract({ left: 200, top: 120, width: 880, height: 480 })
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

/**
 * En dessous, rien n'a bougé.
 *
 * Mesuré sur dix jeux menés de bout en bout : l'ouverture du panneau pèse de
 * 37,6 à 57,8 ; un changement de page, de 12,4 à 64,8 sur 34 pages ; et deux
 * clichés du même écran — dont un pris après une flèche volontairement
 * manquée — rendent 0,00. Le seuil est posé sous le plus petit changement réel
 * et très au-dessus du bruit ; il reste un seuil, et non une égalité, parce
 * que les fonds de jeu sont animés.
 */
const SEUIL_A_BOUGE = 8;

/**
 * Le plafond de pages, et pourquoi il vaut 10.
 *
 * Le panneau est **cyclique** : après « 5/5 », la flèche ramène à « 1/5 ».
 * Le plus long rencontré en compte sept (Cash the Gold). Le plafond n'est donc
 * qu'un garde-fou : la vraie sortie de boucle est le retour à la première page,
 * reconnu par comparaison d'images. Sans elle, on republierait la page 1 en
 * dernière position — le tri des doublons de `capturer-jeux.ts` ne compare que
 * des captures **voisines** et ne la verrait pas.
 */
const PAGES_MAX = 10;

export const UN_SPIN_4_WIN: Adaptateur = {
  studio: '1spin4win',

  /**
   * Le dossier, pas le nom du fichier.
   *
   * Les 226 démos du catalogue passent par `/gmh5/`, sous deux écritures :
   * le lanceur générique `games.html?game=…` et la page du jeu, vers laquelle
   * il redirige. Viser `games.html` en aurait écarté 45 sans un mot — et un lot
   * vide ressemble trop à un lot impossible.
   */
  demoExploitable: (url) => url.includes('1spin4win.com') && url.includes('/gmh5/'),

  /**
   * Trois secondes, et le vrai chargement est attendu dans `ouvrirLeJeu`.
   *
   * Ce délai est consommé par `capturer-jeux.ts` juste après `goto`. Or
   * l'événement `load` arrive ici en moins d'une seconde — il ne dit rien du
   * moteur, qui met encore une à deux secondes à peindre son écran d'accueil.
   * Attendre un temps fixe de plus serait un pari ; `ouvrirLeJeu` attend le
   * bouton lui-même, ce qui vaut sur une démo lente comme sur une rapide.
   */
  chargementMs: 3_000,

  /*
   * Pas de `avecTete` : vérifié sur vingt-deux jeux, la démo se charge, se peint
   * et répond aux clics en Chromium sans tête. Le déclarer coûterait une
   * fenêtre ouverte sur le poste du propriétaire pour chacun des 226 jeux.
   */

  /**
   * Une précaution, pas un seuil mesuré.
   *
   * 1spin4win n'a jamais refusé une démo pendant la reconnaissance, et son
   * plafond — s'il existe — n'est pas publié. BGaming a fait perdre une
   * campagne pour l'avoir découvert en production (Cloudflare 1015 après 227
   * lancements) : dix secondes entre deux paires de jeux coûtent vingt minutes
   * sur tout le catalogue, contre plusieurs heures si l'IP est bannie.
   * `--pause=` la remplace.
   */
  pauseEntreJeuxMs: 10_000,

  /**
   * Ferme l'écran d'accueil, en attendant qu'il soit vraiment là.
   *
   * ── Pourquoi une boucle et pas un délai ────────────────────────────────
   *
   * Le lanceur affiche **le même bouton** pendant le chargement (« Loading… »)
   * et une fois prêt (« CONTINUE ») : mesuré, le fond est le même rouge, seul
   * le mot change — et ce mot, l'OCR ne le lit pas de façon fiable sur ce
   * canvas. Distinguer les deux états à l'image serait donc fragile.
   *
   * On ne les distingue pas : on clique tant que le bandeau est là. Un clic
   * pendant le chargement ne fait rien, le clic sur « CONTINUE » fait entrer,
   * et le bandeau disparaît — la boucle s'arrête d'elle-même. Le jeu commande
   * le rythme au lieu de le subir.
   *
   * Mesuré : le bouton devient cliquable entre 2 et 3 s après `load`, et
   * l'entrée se fait au premier ou au deuxième tour — dix jeux menés de bout en
   * bout ont tous ouvert leur panneau, pour 30 s de traitement en moyenne. Le
   * plafond de 20 tours (~40 s) n'est là que pour une démo en panne, qui
   * ressortira ensuite en « icône des règles introuvable » et restera en file.
   */
  async ouvrirLeJeu(page) {
    for (let tour = 0; tour < 20; tour++) {
      if (!(await accueilAffiche(page))) break;
      await page.mouse.click(CONTINUER.x, CONTINUER.y);
      await page.waitForTimeout(1_500);
    }
    /*
     * Le jeu entre en scène par une animation : rouleaux qui tombent, logo qui
     * se pose. Photographier pendant ce mouvement donnerait une capture « jeu
     * de base » floue ou à moitié montée. Mesuré à trois secondes sur les
     * jeux reconnus, arrondi à quatre.
     */
    await page.waitForTimeout(4_000);
  },

  /**
   * Ouvre le panneau, feuillette ses pages, referme.
   *
   * La première page est celle qui compte : c'est la seule qui porte la ligne
   * « RTP - 97.40% », en haut à gauche du cadre. Les suivantes décrivent les
   * symboles spéciaux, les tours gratuits et les lignes de gain — de la
   * documentation, pas des chiffres.
   *
   * ── Deux contrôles, parce qu'ils ne disent pas la même chose ───────────
   *
   * L'ouverture est jugée sur l'empreinte du centre de l'écran : le panneau
   * couvre les rouleaux. La navigation, elle, est jugée page par page sur la
   * même empreinte — c'est ce qui distingue une flèche cliquée d'une flèche
   * manquée, et c'est ce qui reconnaît le retour à la première page.
   */
  async capturerLesRegles(page, cliche) {
    const jeuAuRepos = await empreinte(page);

    let ouvert = false;
    for (let essai = 0; essai < 2 && !ouvert; essai++) {
      /*
       * Une seconde tentative, et une seule.
       *
       * Le cas à rattraper n'est pas un mauvais pointage — l'icône « i »
       * appartient au lanceur et ne bouge pas — mais un mauvais moment : une
       * animation d'entrée qui traîne et avale le clic. Un second clic au même
       * endroit referme ce que le premier aurait ouvert, donc on le fait
       * précéder d'une attente plutôt que de cliquer deux fois d'affilée.
       */
      if (essai > 0) await page.waitForTimeout(3_000);
      await page.mouse.click(INFO.x, INFO.y);
      await page.waitForTimeout(2_500);
      ouvert = ecartMoyen(jeuAuRepos, await empreinte(page)) > SEUIL_A_BOUGE;
    }
    if (!ouvert) {
      /*
       * On rend 0, pas `SANS_PANNEAU`.
       *
       * `SANS_PANNEAU` affirme qu'un jeu n'a **par conception** rien à
       * documenter, et le retire définitivement de la file. Les vingt-deux
       * habillages reconnus portent tous le même panneau, ouvert par la même
       * icône : un échec ici veut dire qu'on n'a pas su l'ouvrir, pas qu'il
       * n'existe pas — et c'est arrivé une fois sur dix, sur un poste chargé,
       * pour réussir seul à la reprise. L'affirmation serait invérifiable et
       * irréversible.
       */
      return 0;
    }

    let prises = 0;
    const premierePage = await empreinte(page);
    await cliche(`regles-${++prises}`);
    let precedente = premierePage;
    let immobiles = 0;

    for (let n = 1; n < PAGES_MAX; n++) {
      const fleche = await tacheBlanche(page, COIN_FLECHE);
      // Un panneau d'une seule page n'a pas de flèche : ce n'est pas un échec,
      // sa page unique est déjà prise.
      if (!fleche) break;
      await page.mouse.click(fleche.x, fleche.y);
      await page.waitForTimeout(1_800);

      const actuelle = await empreinte(page);
      // Le panneau est cyclique : revenus à la première page, on a tout vu.
      if (ecartMoyen(premierePage, actuelle) < SEUIL_A_BOUGE) break;

      /*
       * Deux pages voisines peuvent être presque identiques, et s'arrêter là
       * coûterait la fin du panneau.
       *
       * Mesuré sur Lucky Clover 27 : ses pages 4 et 5 sont « MEGA JACKPOT » et
       * « MINI JACKPOT », même mise en page, même phrase à un mot près — l'écart
       * mesuré est de **1,7**, sous le seuil. La version précédente y voyait une
       * flèche manquée et rendait quatre pages sur six, en silence.
       *
       * On n'abandonne donc qu'au **deuxième** écran immobile d'affilée : deux
       * pages jumelles, ça existe ; trois de suite, non — c'est un clic qui ne
       * porte plus. Le prix d'une page reprise pour rien est nul, le tri des
       * doublons de `capturer-jeux.ts` l'écarte sur comparaison d'images.
       */
      immobiles = ecartMoyen(precedente, actuelle) < SEUIL_A_BOUGE ? immobiles + 1 : 0;
      if (immobiles >= 2) break;

      await cliche(`regles-${++prises}`);
      precedente = actuelle;
    }

    // Le même « i » referme. Le panneau doit partir avant `capturerLAchat`,
    // qui cliquerait sinon dans la table de gains.
    await page.mouse.click(INFO.x, INFO.y);
    await page.waitForTimeout(1_500);
    return prises;
  },

  /**
   * La boîte d'achat de bonus, **si le jeu en vend une**.
   *
   * ── Pourquoi c'est la pastille qui décide ──────────────────────────────
   *
   * La base ne sait rien de cette fonction chez ce studio : `achatBonus` est
   * `null` sur les 229 fiches. Et le règlement du jeu, qui servirait de source
   * chez BGaming, est ici peint dans le canvas — donc illisible autrement que
   * par un OCR qui se trompe sur cet habillage.
   *
   * Reste ce que l'écran montre : une pastille ronde « BONUS », contre le bord
   * gauche des rouleaux, présente seulement sur les jeux qui vendent la
   * fonction. On la cherche là où elle vit, et son absence vaut réponse.
   *
   * Le sens de l'erreur est choisi : un faux négatif coûte une image ; un faux
   * positif publierait une capture du jeu de base sous la légende « Buying the
   * feature », sur la fiche d'un jeu qui n'a peut-être pas de tours gratuits.
   * D'où la double condition — la pastille est là, **et** l'écran a changé en
   * grand après le clic, ce que seule une boîte qui couvre les rouleaux fait.
   *
   * Rien n'est cliqué ensuite. La boîte affiche « CANCEL » et un bouton vert
   * qui **achète** ; leurs positions suivent l'habillage comme tout le reste,
   * et une confirmation partie par erreur lancerait un tour bonus au milieu de
   * la capture. `capturer-jeux.ts` ferme la page juste après : il n'y a rien à
   * refermer.
   */
  async capturerLAchat(page, cliche) {
    const pastille = await tacheBlanche(page, COLONNE_BONUS);
    if (!pastille) return false;

    const avant = await empreinte(page);
    await page.mouse.click(pastille.x, pastille.y);
    await page.waitForTimeout(3_000);
    if (ecartMoyen(avant, await empreinte(page)) < SEUIL_A_BOUGE * 2) return false;

    await cliche('achat');
    return true;
  },
};
