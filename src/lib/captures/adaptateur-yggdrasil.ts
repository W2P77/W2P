/**
 * L'adaptateur de capture du studio **Yggdrasil**.
 *
 * Il vit dans son propre fichier plutôt que dans `adaptateurs.ts` : plusieurs
 * studios se câblent en parallèle, et un fichier commun aurait fait de chaque
 * ajout un conflit. Le branchement se fait dans la table `ADAPTATEURS`.
 *
 * ── Ce que « Yggdrasil » veut dire ici : une fédération, pas un studio ────
 *
 * Les 457 fiches à capturer ne sortent pas d'un moteur mais d'une trentaine.
 * Yggdrasil distribue sous sa marque les jeux de ses partenaires « YG
 * Masters » (Reel Play, AceRun, Bulletproof, 4ThePlayer, iSense…), chacun
 * avec son propre habillage. Relevé le 13/09/2026 en lisant l'`index.html`
 * des 445 lanceurs depuis le CDN statique :
 *
 *   76  Reel Play (enveloppe « lgp » : jQuery, `#gameiframe`, `#rules_popup`)
 *   64  iSense (`@isense/game-menu`, PixiJS — canvas, sans DOM ; un « § »
 *       dans une barre bas-gauche ×/i/⚙/§ après le voile, 14 requêtes/jeu)
 *   40  un moteur dont le premier script est `gtag`
 *   33  Bulletproof (`bpPlatformGati.js`) + ~22 variantes `build/DepsLibs.js`
 *   30  `debug-loader.js`
 *   30  **hôte mort** (voir plus bas)
 *   20  F40 (`F40Engine`, 4ThePlayer)
 *   16  GATI « gcw » (`wrapper.js` + `gcw.js` : AceRun, LTransparentOrange)
 *   11  Vue (`#app`, `chunk-vendors`)
 *   …   et une longue traîne de studios à un ou deux jeux.
 *
 * Cet adaptateur prend en charge **deux** de ces enveloppes, celles dont le
 * panneau de règles est du **HTML** lisible dans le DOM — donc dont le RTP se
 * lit au chiffre près, sans OCR : GATI « gcw » et Reel Play. Les autres sont
 * **nommées** dans le journal (« moteur Bulletproof, pas encore pris en
 * charge ») plutôt que de tomber en « icône des règles introuvable », qui est
 * le diagnostic d'un adaptateur cassé. Chaque moteur de plus est une
 * reconnaissance à part, et chaque reconnaissance coûte des chargements que
 * le serveur de jeu compte (voir « La cadence »).
 *
 * ── Ce que la base contient, et ce qui n'est plus servi ───────────────────
 *
 * Trois formes de `demoUrl`, toutes sans jeton :
 *
 * · `staticdemo.yggdrasilgaming.com/init/launchClient.html?gameid=…` (285),
 *   un 302 CloudFront vers la forme suivante ;
 * · `staticdemo.yggdrasilgaming.com/<gameid>/index.html?appsrv=…` (113), déjà
 *   résolue — le lanceur y réécrit `countryCode=mt` en `fr` au passage ;
 * · `staticpff.yggdrasilgaming.com/init/launchClient.html?gameid=…` (47),
 *   l'ancien hôte, dont le 302 pointe un autre serveur de jeu
 *   (`productionpff-mt.yggdrasilgaming.com`). **Il vit encore** : 36 de ses
 *   lanceurs servent un jeu — les classiques iSense, Joker Millions, Penguin
 *   City, Dark Vortex, ceux qui ont leur RTP en base. La première version de
 *   ce fichier l'avait déclaré mort sur deux identifiants (7308, 7402) : ils
 *   font partie des 11 qui rendent un `AccessDenied` S3, et la conclusion
 *   était fausse pour les 36 autres. Un hôte ne se juge pas sur deux URL.
 *
 * Trente lanceurs (11 `staticpff`, 19 `staticdemo` : Roulette Evolution,
 * Shark Bait, Cannonade…) mènent bien à un 403 S3 derrière leur 302 : la
 * démo a été retirée. On ne peut pas les écarter par l'URL — elle a la même
 * forme que les vivantes — donc ils sont reconnus à l'exécution, à la page
 * `AccessDenied`, et nommés dans le journal. Douze autres fiches portent la
 * **page produit** du studio : celles-là, `demoExploitable` les écarte.
 *
 * Chromium **sans tête** reçoit le jeu, rouleaux et mise compris — le piège
 * Wazdan (une fiche marketing servie à un User-Agent « Headless ») a été
 * cherché et n'existe pas ici. Le CDN statique est CloudFront + S3 ; il n'a
 * jamais refusé une requête, y compris 445 d'affilée à 1,2 s d'intervalle.
 *
 * ── La cadence : une heure de ban pour trois chargements en une minute ────
 *
 * Le serveur de jeu, `demo.yggdrasilgaming.com`, est derrière **Cloudflare**
 * avec une règle de débit. Mesuré le 13/09/2026 : six chargements de jeu en
 * dix minutes sont passés, puis trois chargements en 65 s (20:01:12, 20:01:44,
 * 20:02:16) ont valu un **429 « error code: 1015 » sur tout l'hôte**, racine
 * comprise, avec `retry-after` **d'une heure** — le compteur décroît
 * régulièrement, sonder ne le prolonge pas. Le seuil exact n'est pas publié.
 *
 * Le runner ne peut pas voir ce ban : `estUneLimiteDeDebit` lit la page
 * principale, et ici la page principale est servie par S3 sans un mot. Le 429
 * tombe sur des **XHR** vers le serveur de jeu — et comme la réponse
 * Cloudflare n'a pas d'en-tête CORS, le navigateur les rend en
 * `net::ERR_FAILED`, sans code. À l'écran, ça donne « Connection Problem »
 * (F40) ou un écran noir (Bulletproof) : le portrait d'un adaptateur cassé.
 * D'où, dans cet adaptateur : une oreille sur les réponses 429 du serveur de
 * jeu, et, quand le jeu ne donne pas signe de vie, **une** requête directe au
 * serveur pour lire son code — c'est le seul moyen d'obtenir le 429 en clair.
 * Sur un 429, `LimiteDeDebit` arrête la campagne : continuer coûterait une
 * heure de plus.
 *
 * `pauseEntreJeuxMs` est une précaution large, pas un seuil mesuré, et il
 * faut savoir que `capturer-jeux.ts` ouvre ses jeux **deux par deux**
 * (`PARALLELE = 2`) : deux chargements simultanés, c'est déjà la moitié de ce
 * qui a déclenché le ban. `--pause=` la remplace ; `PARALLELE = 1` serait le
 * vrai réglage, et c'est une constante du runner — un autre fichier.
 *
 * ── GATI « gcw » : un panneau HTML sous une barre en canvas ───────────────
 *
 * La page pose deux canvas plein écran et une `div#wrapperRules` présente dès
 * le départ, invisible (`visibility: hidden`), remplie de `h3`/`ul`/`li` dès
 * que le jeu a reçu sa configuration. Le jeu s'ouvre sur un écran d'accueil
 * (« DON'T SHOW THIS NEXT TIME » · **CONTINUE** à (872, 568) sur 10 Hot
 * Hotfire), et la barre du haut, peinte dans le canvas, porte deux icônes :
 * une maison à (20, 15) qui **recharge le jeu** — cliquée une fois par
 * erreur, tout le chargement est reparti — et un « § » à (52, 15) qui rend
 * `#wrapperRules` visible, à (119, 84) en 1043 × 569, défilant sur lui-même
 * (`scrollTop` s'écrit et se vérifie : 0 → 2 304 → bas). Tant que l'accueil
 * est là, le « § » n'ouvre rien : vérifié, le panneau reste `hidden`.
 *
 * Le texte porte une section **« RETURN TO PLAYER »** : « The expected
 * payback reflects the theoretical return across a very large number of
 * plays… The overall theoretical return to player is 96.0%. » (10 Hot
 * Hotfire, relevé à l'écran) — la formulation d'Evoplay au mot près, que
 * `extraireLesFaits` **ne lit pas** (vérifié : `rtp: null` sur la phrase
 * exacte). Le taux est bien à l'écran, c'est l'interprétation qui manque ;
 * c'est un autre fichier. Le garde-fou de publication, lui, passe : la
 * section « GAME OPTIONS » écrit « Info – Shows paytable » et la dernière
 * ligne « This is game rules version 1 ».
 *
 * ── Reel Play : le panneau s'ouvre par une fonction, pas par un bouton ────
 *
 * L'enveloppe « lgp » pose trois iframes (`#y_shifter`, `#gameiframe`,
 * `#base_buffer`) et une quatrième, `#rules_popup`, sur `gamerules.html` —
 * une coquille dont `#game_rules` est rempli par `launch.js` avec
 * `config.translations.game.gameRules`, le règlement que le serveur envoie.
 * `integration.js` expose `lgpCallbacks.lgpwr_showGameRules()` et
 * `lgpwr_hideGameRules()`, qui ne font que basculer `display` de l'iframe.
 * On les appelle donc directement : rien à chercher dans le canvas, et un
 * échec est bruyant (la fonction n'existe pas) au lieu d'être un clic dans
 * le vide. Le texte défile dans `#content_area`, à l'intérieur de l'iframe.
 *
 * Le jeu, lui, est dans `#gameiframe` et s'ouvre sur un voile « PRESS
 * ANYWHERE TO BEGIN » : un clic au centre, vérifié à l'image. **Jamais
 * Espace** — le règlement l'écrit, « Pressing the Space bar will initiate
 * Spin ». Seize requêtes au serveur de jeu par chargement, mesurées.
 *
 * ── Reel Play publie son taux, et parfois ce n'est pas le bon ─────────────
 *
 * La ligne est « The Theoretical Average Return to Player is: 94.0% »
 * (10,000 Wonders Big Bang, relevé à l'écran) — sans le sigle, donc hors de
 * portée de `extraireLesFaits` (vérifié : `rtp: null`). Et **94,0 n'est pas
 * le taux par défaut** : `launch.js` lui-même pose `rtp_variant_active` dès
 * que le règlement contient « 94.0 », « 90.5 » ou « 86.0 » — ce sont les
 * variantes réduites que les opérateurs peuvent choisir, et la démo publique
 * en sert une. La fiche produit du studio le confirme mot pour mot :
 * `yggdrasilgaming.com/games/10000-wonders-big-bang` annonce « RTP 96%, 94%,
 * 90.5% » — le défaut en premier, les variantes ensuite. Publier 94,0 en
 * source studio serait exactement le mensonge que le site promet d'éviter.
 * L'adaptateur relit ce drapeau et refuse le jeu, en le disant : la fiche
 * reste en file, sans chiffre.
 *
 * GATI n'a pas ce drapeau, et un 94,0 y est parfois le vrai défaut : 40 Crown
 * Hotfire affiche 94,0 % dans son panneau et sa fiche produit dit « RTP
 * 94.0%, 90.5% ». On ne peut donc pas refuser un chiffre sur sa seule valeur ;
 * la fiche produit (`/games/<slug>`, première valeur de la ligne « RTP ») est
 * l'arbitre quand le panneau et la base se contredisent.
 *
 * Le garde-fou de publication (`EN_TETE_PANNEAU`) ne trouve ici ni « RTP »
 * ni « PAYTABLE » : seul « This is game rules version N », tout en bas,
 * passe — et il faut qu'il soit dans les 1 200 premiers caractères d'une
 * vue. D'où la dernière capture, placée pour **commencer** par cette ligne.
 */
import sharp from 'sharp';
import type { Frame, Page } from 'playwright';
import type { Adaptateur } from './adaptateurs';
import { LimiteDeDebit } from './limite-de-debit';

/** Le serveur de jeu, celui que Cloudflare compte. */
const SERVEUR_DE_JEU = 'demo.yggdrasilgaming.com';

/**
 * Tout serveur de jeu du studio — `demo.` pour `staticdemo`,
 * `productionpff-mt.` pour `staticpff` — et jamais le CDN `static*`, qui
 * n'est pas compté et ne rend pas de 429.
 */
const estUnServeurDeJeu = (url: string) => {
  const hote = new URL(url).hostname;
  return hote.endsWith('.yggdrasilgaming.com') && !hote.startsWith('static');
};

/**
 * La requête la plus légère qu'on connaisse au serveur de jeu.
 *
 * Elle ne sert qu'à lire le code de réponse quand le jeu ne donne pas signe
 * de vie : c'est le seul moyen de distinguer un 429 (le ban) d'un jeu
 * simplement lent ou cassé, puisque le navigateur avale le 429 en
 * `ERR_FAILED`. Une requête, une seule, et seulement sur le chemin d'échec.
 */
const SONDE_DU_SERVEUR = `https://${SERVEUR_DE_JEU}/game.web/service?fn=version`;

/**
 * Les lanceurs, sur les deux hôtes — une page produit n'est pas un jeu.
 * Une démo retirée a la même forme d'URL : elle se reconnaît à l'exécution.
 */
const LANCEUR =
  /^https:\/\/static(?:demo|pff)\.yggdrasilgaming\.com\/(?:init\/launchClient\.html\?gameid=\d+|\d+\/index\.html\?)/;

/** Le « § » de la barre GATI, peinte dans le canvas ; la maison à (20, 15) recharge le jeu. */
const GATI_REGLES = { x: 52, y: 15 };

/** Le bouton CONTINUE de l'accueil GATI, mesuré sur 10 Hot Hotfire. */
const GATI_CONTINUER = { x: 872, y: 568 };

/**
 * Un cran de défilement du panneau GATI : 569 px visibles, 28 px par ligne.
 * Avec un pas inférieur à 569 − 28, toute ligne est entière sur au moins un
 * cran — le garde-fou du contrôle direct de `ligneRtpVisible`.
 */
const GATI_CRAN = 480;

/** Le centre de l'écran, que seul un changement d'écran entier modifie en grand. */
const CENTRE = { left: 200, top: 120, width: 880, height: 480 };

/** Au-dessus, l'écran a changé (accueil fermé, panneau ouvert). Mesuré à 0,5 au repos. */
const SEUIL_A_BOUGE = 8;

/** Le plafond de vues d'un règlement : au-delà, la fiche se noie dans sa documentation. */
const PRISES_MAX = 8;

type Moteur = 'gati' | 'reelplay' | { inconnu: string };

async function empreinte(page: Page): Promise<Buffer> {
  return sharp(await page.screenshot())
    .extract(CENTRE)
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
 * Le moteur qui tourne dans la page, reconnu à ce qu'il pose dans le DOM.
 *
 * GATI « gcw » pose `#wrapperRules` dès le premier rendu ; Reel Play pose
 * `#rules_popup` et le global `lgpCallbacks`. Pour les autres, on rend une
 * signature lisible — l'identifiant ou le premier script — pour que le
 * journal dise **quel** moteur manque, et que la reconnaissance suivante
 * sache par où commencer.
 */
async function moteur(page: Page): Promise<Moteur> {
  return page.evaluate(() => {
    if (document.querySelector('#wrapperRules')) return 'gati';
    // Le 302 du lanceur a mené à un `AccessDenied` S3 : la démo est retirée.
    if (/AccessDenied/.test(document.documentElement.textContent ?? '')) return { inconnu: 'RETIRE' };
    if (document.querySelector('#rules_popup') && 'lgpCallbacks' in window) return 'reelplay';
    if (document.querySelector('#f40CheatPanel')) return { inconnu: 'F40' };
    if (document.querySelector('.canvasContainer')) return { inconnu: 'Bulletproof' };
    if (document.querySelector('#app')) return { inconnu: 'Vue' };

    /*
     * Faute de marqueur, on nomme le moteur par son script — mais pas
     * n'importe lequel, et pas tel quel.
     *
     * Premiere version : le PREMIER `script[src]` de la page. Sur 86 jeux,
     * 18 se sont ainsi appeles « googletagmanager » ou
     * « google-analytics » : le marqueur d'audience est charge avant le
     * moteur, donc il gagnait. Et quatre jeux d'une meme famille sont sortis
     * sous quatre noms differents — `./preloader.js?v=607.0.0`,
     * `?v=489.0.0`, `?v=0.0.948` — parce que la version fait partie de l'URL.
     *
     * Un nom qui varie pour un meme moteur empeche de voir ce qui domine :
     * c'est la mesure qu'on casse, pas seulement la lisibilite.
     */
    const TIERS = /google-analytics|googletagmanager|gtag|hotjar|sentry|newrelic|cloudflare|facebook\.net|doubleclick/i;
    const scripts = [...document.querySelectorAll('script[src]')]
      .map((s) => s.getAttribute('src') ?? '')
      .filter((src) => src && !TIERS.test(src));

    const brut = scripts[0];
    if (!brut) return { inconnu: 'sans script' };

    /* On garde le nom de fichier, sans hash de build ni version. */
    const nom = (brut.split('?')[0].split('/').pop() || brut)
      .replace(/[.-][0-9a-f]{8,}(?=\.)/i, '')
      .slice(0, 30);
    return { inconnu: nom || 'sans nom' };
  });
}

/**
 * Demande son code au serveur de jeu, et lève `LimiteDeDebit` s'il nous bannit.
 *
 * `page.request` passe par le contexte du navigateur — même User-Agent, mêmes
 * cookies — mais hors CORS : c'est ce qui rend le 429 lisible.
 */
async function verifierLeBan(page: Page): Promise<void> {
  const code = await page.request
    .get(SONDE_DU_SERVEUR, { timeout: 15_000 })
    .then((r) => r.status())
    .catch(() => 0);
  if (code === 429) throw new LimiteDeDebit(SERVEUR_DE_JEU);
}

/**
 * Pose l'oreille sur les 429 du serveur de jeu, pour toute la vie de la page.
 *
 * Un 429 vu **pendant** qu'on travaille vaut autant qu'un 429 au chargement :
 * dès qu'il est là, chaque requête suivante est perdue, et la campagne avec.
 * Le drapeau est relu aux points où l'on attend le jeu.
 */
function ecouterLeBan(page: Page): { banni: boolean } {
  const etat = { banni: false };
  page.on('response', (r) => {
    if (r.status() === 429 && estUnServeurDeJeu(r.url())) etat.banni = true;
  });
  return etat;
}

/**
 * Vrai si la ligne du RTP est entièrement dans la fenêtre visible du panneau.
 *
 * On cherche l'élément **le plus profond** qui porte la phrase : la ligne vit
 * dans un `li` (GATI) ou un `p` (Reel Play) sans enfant, mais rien ne garantit
 * qu'un moteur n'y mette pas un `<br>` — c'est le piège payé chez Stakelogic.
 */
async function ligneRtpVisible(cadre: Frame | Page, panneau: string): Promise<boolean> {
  return cadre.evaluate((sel) => {
    const boite = document.querySelector(sel);
    if (!boite) return false;
    const zone = boite.getBoundingClientRect();
    const motif = /return to player|\bRTP\b/i;
    const candidats = [...boite.querySelectorAll('*')].filter(
      (el) =>
        motif.test(el.textContent ?? '') &&
        ![...el.children].some((c) => motif.test(c.textContent ?? '')),
    );
    return candidats.some((el) => {
      const r = el.getBoundingClientRect();
      return r.height > 0 && r.top >= zone.top && r.bottom <= zone.bottom;
    });
  }, panneau);
}

/**
 * Descend un conteneur cran par cran, en photographiant chaque vue, et en
 * s'assurant que la ligne du RTP est entière sur au moins l'une d'elles.
 *
 * `scrollTop` est écrit **et relu** : quand il ne bouge plus, on est en bas.
 * C'est la question que l'adaptateur BGaming a trouvée sans réponse sur son
 * panneau ; elle se pose à chaque moteur et ne se suppose jamais.
 */
async function feuilleter(
  cadre: Frame | Page,
  conteneur: string,
  cran: number,
  cliche: (nom: string) => Promise<void>,
  prisesDeja: number,
): Promise<number> {
  let prises = prisesDeja;
  let rtpPris = await ligneRtpVisible(cadre, conteneur);
  for (let n = 0; n < 40; n++) {
    const bouge = await cadre.evaluate(
      ({ sel, pas }) => {
        const boite = document.querySelector(sel) as HTMLElement | null;
        if (!boite) return false;
        const avant = boite.scrollTop;
        boite.scrollTop = avant + pas;
        return boite.scrollTop !== avant;
      },
      { sel: conteneur, pas: cran },
    );
    if (!bouge) break;
    await cadre.waitForTimeout(700);
    const rtpIci = !rtpPris && (await ligneRtpVisible(cadre, conteneur));
    // Le RTP passe avant le plafond : c'est lui qu'on vient chercher.
    if (rtpIci || prises < PRISES_MAX) {
      await cliche(`regles-${++prises}`);
      if (rtpIci) rtpPris = true;
    }
  }
  return prises;
}

/* ── GATI « gcw » ───────────────────────────────────────────────────────── */

const GATI_PANNEAU = '#wrapperRules';

async function gatiOuvert(page: Page): Promise<boolean> {
  return page.evaluate((sel) => {
    const r = document.querySelector(sel) as HTMLElement | null;
    if (!r) return false;
    const b = r.getBoundingClientRect();
    return getComputedStyle(r).visibility === 'visible' && b.width > 0 && (r.innerText ?? '').length > 100;
  }, GATI_PANNEAU);
}

async function gatiOuvrirLeJeu(page: Page, ban: { banni: boolean }): Promise<void> {
  /*
   * Le règlement n'est rempli qu'une fois la configuration reçue du serveur
   * de jeu : c'est le témoin que le jeu est vivant, et le premier endroit où
   * un ban se voit. Trente secondes sans lui, et on demande son code au
   * serveur avant de conclure.
   */
  const pret = await page
    .waitForFunction((sel) => document.querySelectorAll(`${sel} h3`).length > 0, GATI_PANNEAU, {
      timeout: 30_000,
    })
    .then(() => true)
    .catch(() => false);
  if (!pret || ban.banni) {
    await verifierLeBan(page);
    throw new Error("le jeu GATI n'a pas reçu ses règles en 30 s");
  }
  // L'accueil se peint après la configuration ; on lui laisse le temps.
  await page.waitForTimeout(4_000);

  /*
   * L'accueil se ferme par CONTINUE, quand il y en a un. 10 Hot Hotfire en a
   * un ; 40 Crown Hotfire, même moteur, ouvre directement sur les rouleaux,
   * et (872, 568) y tombe sur le décor sans rien faire — c'est le cas
   * bénin.
   *
   * **Jamais Espace.** La première version le pressait en second recours
   * quand le clic n'avait rien changé : sur 40 Crown Hotfire, qui n'a pas
   * d'accueil, ça a lancé un tour — la capture de base de la simulation
   * affichait un solde de 10 999 au lieu de 11 000, et des rouleaux qu'un
   * joueur avait fait tourner. Un accueil récalcitrant vaut mieux qu'un
   * tour joué : le « § » n'ouvrira rien, le jeu rendra 0 et restera en file,
   * ce qui se voit dans le journal.
   */
  await page.mouse.click(GATI_CONTINUER.x, GATI_CONTINUER.y);
  await page.waitForTimeout(2_500);
  // Le curseur, laissé sur CONTINUE, fait lever l'infobulle « Hold to start
  // autoplay » du bouton de tour qui prend sa place : on l'écarte avant de
  // photographier. Les rouleaux entrent en scène ; photographier pendant le
  // mouvement donnerait une capture de base à moitié montée.
  await page.mouse.move(640, 300);
  await page.waitForTimeout(3_000);
}

async function gatiCapturerLesRegles(page: Page, cliche: (nom: string) => Promise<void>): Promise<number> {
  /*
   * Deux essais, séparés par une attente et non par un second clic immédiat :
   * le « § » est un interrupteur, et deux clics d'affilée sur un panneau qui
   * s'ouvrait lentement le refermeraient.
   */
  let ouvert = false;
  for (let essai = 0; essai < 2 && !ouvert; essai++) {
    if (essai > 0) await page.waitForTimeout(3_000);
    ouvert = await gatiOuvert(page);
    if (ouvert) break;
    await page.mouse.click(GATI_REGLES.x, GATI_REGLES.y);
    await page.waitForTimeout(2_500);
    ouvert = await gatiOuvert(page);
  }
  /*
   * On rend 0, pas `SANS_PANNEAU` : tous les jeux GATI portent ce panneau.
   * Un échec ici veut dire qu'on n'a pas su l'ouvrir — accueil récalcitrant,
   * poste chargé — pas qu'il n'existe pas.
   */
  if (!ouvert) return 0;

  /*
   * Le texte commence à x = 133 et `lireLesRegles` recadre à partir de
   * x = 130 : trois pixels de marge, c'est trop peu pour que l'OCR lise la
   * première lettre de chaque ligne. On décale le contenu, pas le panneau —
   * le cadre reste là où le jeu l'a peint.
   */
  await page.addStyleTag({
    content: `${GATI_PANNEAU} > * { margin-left: 30px !important; }`,
  });
  await page.waitForTimeout(500);

  let prises = 0;
  await cliche(`regles-${++prises}`);
  prises = await feuilleter(page, GATI_PANNEAU, GATI_CRAN, cliche, prises);

  // Le même « § » referme ; s'il ne le fait pas, le runner ferme la page
  // juste après et `capturerLAchat` ne clique rien.
  await page.mouse.click(GATI_REGLES.x, GATI_REGLES.y);
  await page.waitForTimeout(1_500);
  if (await gatiOuvert(page)) await page.keyboard.press('Escape');
  return prises;
}

/* ── Reel Play (« lgp ») ────────────────────────────────────────────────── */

const REELPLAY_CADRE = /gamerules\.html/;
const REELPLAY_TEXTE = '#content_area';

const cadreReelPlay = (page: Page): Frame | undefined =>
  page.frames().find((f) => REELPLAY_CADRE.test(f.url()));

async function reelplayReglesRemplies(page: Page): Promise<boolean> {
  const cadre = cadreReelPlay(page);
  if (!cadre) return false;
  return cadre
    .evaluate(() => (document.getElementById('game_rules')?.innerText ?? '').length > 100)
    .catch(() => false);
}

async function reelplayOuvrirLeJeu(page: Page, ban: { banni: boolean }): Promise<void> {
  /*
   * Ici aussi, le règlement arrive avec la configuration : `launch.js` ne
   * remplit `#game_rules` qu'à `lgpwr_configReceived`. Son absence au bout de
   * trente secondes, c'est le serveur qui ne répond pas — et il faut savoir
   * s'il refuse ou s'il traîne.
   */
  const limite = Date.now() + 30_000;
  while (!(await reelplayReglesRemplies(page))) {
    if (Date.now() > limite || ban.banni) {
      await verifierLeBan(page);
      throw new Error("l'enveloppe Reel Play n'a pas reçu ses règles en 30 s");
    }
    await page.waitForTimeout(1_000);
  }
  // Le jeu, dans son iframe, se charge après la configuration.
  await page.waitForTimeout(8_000);

  /*
   * Le voile « PRESS ANYWHERE TO BEGIN » se ferme d'un clic au centre, et on
   * vérifie que l'écran a changé : un premier clic donné pendant l'animation
   * d'entrée est avalé — c'est arrivé à la reconnaissance, le voile était
   * encore là trente secondes plus tard. Trois essais, jamais Espace.
   */
  for (let essai = 0; essai < 3; essai++) {
    const avant = await empreinte(page);
    await page.mouse.click(640, 400);
    await page.waitForTimeout(3_000);
    if (ecartMoyen(avant, await empreinte(page)) > SEUIL_A_BOUGE) break;
  }
  await page.waitForTimeout(2_000);
}

async function reelplayCapturerLesRegles(page: Page, cliche: (nom: string) => Promise<void>): Promise<number> {
  const montre = await page
    .evaluate(() => {
      (window as unknown as { lgpCallbacks: { lgpwr_showGameRules: () => void } }).lgpCallbacks.lgpwr_showGameRules();
      return true;
    })
    .catch(() => false);
  if (!montre) return 0;
  await page.waitForTimeout(1_500);

  const cadre = cadreReelPlay(page);
  const visible = await page
    .evaluate(() => {
      const f = document.getElementById('rules_popup');
      if (!f) return false;
      const b = f.getBoundingClientRect();
      return getComputedStyle(f).display !== 'none' && b.width > 0 && b.height > 0;
    })
    .catch(() => false);
  if (!cadre || !visible) return 0;

  const variante = await page
    .evaluate(() => (window as unknown as { lgp_data?: { rtp_variant_active?: boolean } }).lgp_data?.rtp_variant_active === true)
    .catch(() => false);
  if (variante) {
    // Soixante caractères : c'est ce que le journal du runner garde.
    throw new Error('démo en variante de RTP réduite (pas le taux par défaut)');
  }

  /*
   * Le règlement est écrit à 3 % du bord gauche, soit x ≈ 38 : tout ce qui
   * est avant x = 130 sort du recadrage de `lireLesRegles`, et l'OCR lirait
   * « e theoretical return ». Même remède que chez Nolimit City : une marge,
   * dans l'iframe, et rien d'autre.
   */
  await cadre.addStyleTag({
    content: '#game_rules { margin-left: 140px !important; width: 82% !important; }',
  });
  await page.waitForTimeout(500);

  let prises = 0;
  await cliche(`regles-${++prises}`);
  const cran = await cadre.evaluate(
    (sel) => Math.max(200, (document.querySelector(sel)?.clientHeight ?? 400) - 60),
    REELPLAY_TEXTE,
  );
  prises = await feuilleter(cadre, REELPLAY_TEXTE, cran, cliche, prises);

  // La vue qui commence par « This is game rules version N » : la seule que
  // le garde-fou de publication reconnaisse dans ce texte.
  const placee = await cadre.evaluate(
    ({ sel, motif }) => {
      const boite = document.querySelector(sel) as HTMLElement | null;
      if (!boite) return false;
      const regle = new RegExp(motif, 'i');
      const marcheur = document.createTreeWalker(boite, NodeFilter.SHOW_TEXT);
      let noeud: Node | null = null;
      while ((noeud = marcheur.nextNode())) if (regle.test(noeud.textContent ?? '')) break;
      if (!noeud) return false;
      const zone = document.createRange();
      zone.selectNode(noeud);
      const avant = boite.scrollTop;
      boite.scrollTop = avant + zone.getBoundingClientRect().top - boite.getBoundingClientRect().top - 4;
      return boite.scrollTop !== avant;
    },
    { sel: REELPLAY_TEXTE, motif: 'game rules version' },
  );
  if (placee) {
    await page.waitForTimeout(700);
    await cliche(`regles-${++prises}`);
  }

  await page
    .evaluate(() => {
      (window as unknown as { lgpCallbacks: { lgpwr_hideGameRules: () => void } }).lgpCallbacks.lgpwr_hideGameRules();
    })
    .catch(() => {});
  await page.waitForTimeout(1_000);
  return prises;
}

/* ── L'adaptateur ───────────────────────────────────────────────────────── */

/**
 * Le moteur reconnu à l'ouverture, retenu pour la suite du même jeu.
 *
 * Le runner appelle `ouvrirLeJeu` puis `capturerLesRegles` sur la même
 * `Page` : la clé est la page elle-même, et l'entrée part avec elle.
 */
const moteurs = new WeakMap<Page, Moteur>();
const bans = new WeakMap<Page, { banni: boolean }>();

export const YGGDRASIL: Adaptateur = {
  studio: 'yggdrasil',

  demoExploitable: (url) => LANCEUR.test(url),

  /**
   * Deux secondes, et c'est volontairement trop peu pour un jeu : `load`
   * arrive en 0,4 s sur une page S3 qui ne contient rien. Le vrai chargement
   * — configuration reçue du serveur de jeu — est attendu dans `ouvrirLeJeu`,
   * par moteur, parce que chaque moteur a son propre témoin.
   */
  chargementMs: 2_000,

  /*
   * Pas de `avecTete` : vérifié sur GATI, Reel Play, Bulletproof et F40, la
   * démo se charge et répond aux clics en Chromium sans tête. Le déclarer
   * coûterait une fenêtre ouverte sur le poste pour chacun des 445 jeux.
   */

  /**
   * Deux minutes entre deux lots, et c'est une précaution, pas un seuil.
   *
   * Trois chargements en 65 s ont valu une heure de ban ; six en dix minutes
   * sont passés. Le runner ouvre deux jeux à la fois, donc deux chargements
   * toutes les deux minutes — six en six minutes, sous ce qui a été vu passer.
   * Le seuil exact n'est pas publié, chaque mesure coûte une heure, et
   * `--pause=` remplace cette valeur.
   */
  pauseEntreJeuxMs: 120_000,

  async ouvrirLeJeu(page) {
    const ban = ecouterLeBan(page);
    bans.set(page, ban);

    /*
     * Le moteur se lit dans le DOM, mais pas toujours au premier rendu.
     *
     * Sur 10 Hot Hotfire, `#wrapperRules` est dans l'HTML de l'index ; sur
     * 40 Crown Hotfire (même moteur, `wrapper.js` plus récent), c'est le
     * script qui le crée — présent et rempli à 12 s sur un poste calme. Avec
     * cinq secondes de marge, la simulation l'a déclaré « moteur inconnu »
     * pendant que deux jeux se chargeaient en parallèle et que l'OCR du
     * précédent tournait à côté. Vingt secondes : assez pour un poste
     * chargé, et un moteur vraiment inconnu sort toujours nommé, pas après
     * une minute d'attente d'un panneau qui n'existe pas.
     */
    let quel = await moteur(page);
    for (let essai = 0; typeof quel !== 'string' && essai < 20; essai++) {
      await page.waitForTimeout(1_000);
      quel = await moteur(page);
    }
    moteurs.set(page, quel);
    if (typeof quel !== 'string') {
      if (ban.banni) throw new LimiteDeDebit(SERVEUR_DE_JEU);
      if (quel.inconnu === 'RETIRE') throw new Error('démo retirée : le lanceur mène à un AccessDenied S3');
      throw new Error(`moteur ${quel.inconnu}, pas encore pris en charge`);
    }
    if (quel === 'gati') await gatiOuvrirLeJeu(page, ban);
    else await reelplayOuvrirLeJeu(page, ban);
  },

  async capturerLesRegles(page, cliche) {
    const quel = moteurs.get(page);
    if (bans.get(page)?.banni) throw new LimiteDeDebit(SERVEUR_DE_JEU);
    if (quel === 'gati') return gatiCapturerLesRegles(page, cliche);
    if (quel === 'reelplay') return reelplayCapturerLesRegles(page, cliche);
    return 0;
  },

  /**
   * Rien n'est acheté, chez aucun des deux moteurs.
   *
   * Ni GATI ni Reel Play n'exposent leur bouton d'achat dans le DOM : il est
   * peint dans le canvas, à une place qui suit l'habillage du partenaire, et
   * la base ne sait pas quels jeux vendent leur fonction. Un clic à l'aveugle
   * publierait le jeu de base sous la légende « Buying the feature » — la
   * faute que le contrôle `/BUY/i` de Pragmatic existe pour empêcher. Un faux
   * négatif coûte une image ; on le préfère.
   */
  async capturerLAchat() {
    return false;
  },
};
