/**
 * L'adaptateur de capture de Push Gaming.
 *
 * Fichier séparé de `adaptateurs.ts` à dessein : plusieurs studios sont
 * instruits en parallèle, et la table `ADAPTATEURS` est le seul point où ils se
 * croiseraient. Le branchement s'y fait en une ligne — mais **lire l'avis de
 * blocage ci-dessous avant de la poser** : en l'état, brancher cet adaptateur
 * ne débloque aucune fiche, il fait échouer 82 jeux l'un après l'autre.
 *
 * ── Le chemin d'accès, tel qu'il est réellement construit ──────────────────
 *
 * `demoUrl` en base est la **page enveloppe** du studio,
 * `www.pushgaming.com/games/play/<slug>.html`. Ce n'est pas le lanceur : c'est
 * un document de quatre kilo-octets dont tout le corps tient en une `<iframe
 * id="game-iframe">` posée à `data:text/html,<p></p>`, qu'un script en ligne
 * réécrit aussitôt :
 *
 *     var gameUrl = 'aHR0cHM6Ly9wbGF5ZXIu…' + '…';
 *     document.getElementById('game-iframe').setAttribute('src', atob(gameUrl));
 *
 * Le base64 décodé donne
 * `https://player.eu.demo.pushgaming.com/mesh/b2c/igp/pg-com/launch?mode=DEMO
 * &country=GB&rgsCode=hive&ccyCode=fun&jurisdiction=NA&rgsGameId=<id>&lang=en
 * &token=<uuid>&lobbyUrl=…`.
 *
 * C'est **l'enveloppe** qu'on garde en base, et pas cette URL-là : le `token`
 * est frappé à chaque service de la page, et une adresse figée en base vieillit
 * mal. On ouvre donc l'enveloppe et on laisse l'iframe se charger, comme
 * l'adaptateur Play'n GO le fait de sa page vitrine.
 *
 * Mesuré sur `big-bamboo`, `jammin-jars` et `razor-shark`, Chromium sans tête,
 * viewport 1280×800 : l'enveloppe est en `load` entre 863 et 1 049 ms, et
 * l'iframe porte son vrai `src` entre 6 et 9 ms plus tard — le script est en
 * ligne, il s'exécute à l'analyse du document. Il n'y a donc **rien à attendre**
 * côté enveloppe ; tout le temps de chargement est celui du jeu, dans le cadre.
 *
 * ── L'avis de blocage : le lanceur est géo-bloqué depuis la France ─────────
 *
 * `player.eu.demo.pushgaming.com` est une distribution CloudFront **restreinte
 * par pays**. Depuis l'IP du poste (Free SAS, Paris, FR) elle répond `403` avec
 * le corps standard d'AWS : « The Amazon CloudFront distribution is configured
 * to block access from your country. »
 *
 * Ce n'est pas le token qui est en cause, et c'est la correction importante :
 * le CHANGELOG du 12/09/2026 a conclu « token à usage unique qui répond 403
 * rejoué », ce qui était l'hypothèse raisonnable au moment où le lanceur n'était
 * lu que pour être vérifié. La mesure la contredit — un token **fraîchement**
 * émis, décodé et appelé pour la toute première fois, répond lui aussi 403, et
 * en **45 ms** : la requête est refusée au POP CDG55, elle n'atteint jamais
 * l'origine. Un token périmé se refuse à l'origine, pas au bord.
 *
 * Le blocage porte sur la distribution entière et non sur le chemin de
 * lancement : la racine `https://player.eu.demo.pushgaming.com/` rend le même
 * 403. Et il n'y a pas de porte de côté — les 60 sous-domaines déclarés dans les
 * journaux de transparence des certificats ont été passés en revue, aucun autre
 * hôte de démo ne résout (`demo.`, `player.demo.`, `player.us.demo.`,
 * `player.eu.social.` : pas d'enregistrement DNS ou pas de service). Les 84
 * enveloppes pointent toutes sur cet unique hôte.
 *
 * **Conséquence, nommée pour qu'elle ne se redécouvre pas** : aucune séquence de
 * clics ne peut être trouvée depuis ce poste, puisqu'aucun jeu ne s'affiche.
 * Les coordonnées, le nombre de pages de règles et les délais de chargement du
 * jeu manquent, et ils ne seront pas devinés — un adaptateur aux coordonnées
 * inventées capture le décor et le publie sous la légende « Game rules ».
 * Il faut une **sortie réseau hors de France** (le pays exact reste à trouver ;
 * `country=GB` dans le lanceur suggère que le Royaume-Uni passe), et la
 * reconnaissance visuelle se fera alors en une séance.
 *
 * ── Pourquoi cet adaptateur existe quand même ──────────────────────────────
 *
 * Parce que sans lui, le blocage est **invisible**. `capturer-jeux.ts` teste le
 * ban sur `page.content()`, qui ne rend que le document du cadre principal :
 * vérifié, il ne contient pas le 403, qui vit dans l'iframe. Le runner
 * capturerait donc une page blanche en guise de « jeu de base », ne trouverait
 * aucun panneau, écrirait « icône des règles introuvable, jeu laissé en file »
 * — le diagnostic d'un adaptateur mal réglé — et recommencerait à chaque
 * campagne sur les 82 fiches. C'est le piège déjà payé chez Pragmatic avec les
 * classiques sans panneau, et il coûterait ici 82 rechargements par campagne
 * pour un message qui envoie chercher au mauvais endroit.
 *
 * `ouvrirLeJeu` lit donc le cadre du jeu et, s'il y trouve l'avis de CloudFront,
 * le dit dans le journal avec ces mots-là. Le jeu reste en file, aucune capture
 * n'est publiée, et personne ne repart sur la piste des coordonnées.
 *
 * ── Navigateur sans tête : suffisant, et le restera probablement ───────────
 *
 * Toute la reconnaissance a été menée en `headless: true`. L'enveloppe se sert
 * normalement et l'iframe s'attache ; le 403 est **identique** au `curl` en
 * ligne de commande, à la milliseconde près, donc il ne doit rien au navigateur.
 * Aucun `avecTete` n'est déclaré ici.
 *
 * Ce que cela ne prouve pas : que le **jeu** se contente d'un Chromium sans
 * tête. C'est invérifiable tant que le lanceur refuse la connexion. Si la
 * première campagne derrière une sortie réseau non française voit « Connection
 * lost to wallet » ou un moteur qui ne démarre jamais, c'est cette piste-là
 * qu'il faut suivre — `avecTete: true`, comme Hacksaw derrière Cloudflare — et
 * non les coordonnées.
 *
 * ── Cadence : rien d'observé, donc rien d'écrit ────────────────────────────
 *
 * Push Gaming est un partenaire, et `pauseEntreJeuxMs` existe pour le ménager.
 * Il n'est pas déclaré parce qu'aucune limite n'a été observée : une vingtaine
 * d'enveloppes servies coup sur coup, toutes en 200. Mais l'enveloppe est un
 * document statique de `www.pushgaming.com` — ce n'est pas là qu'une limite se
 * manifesterait. C'est le lanceur qui compte, et il n'a jamais répondu autre
 * chose qu'un 403 de bord. Le jour où la campagne tournera vraiment, surveiller
 * les premiers lots avant de monter la cadence, et poser ici la valeur mesurée
 * plutôt qu'une précaution de principe.
 */
import type { Page } from 'playwright';
import type { Adaptateur } from './adaptateurs';

/**
 * La page enveloppe du studio — la seule forme de `demoUrl` exploitable.
 *
 * 84 des 85 fiches Push Gaming portent une `demoUrl` ; 82 ont cette forme. Les
 * deux autres (`blaze-ra`, `mount-magmas`) pointent la **fiche produit**
 * `pushgaming.com/games/<slug>.html`, qui ne contient ni iframe, ni bouton, ni
 * le mot « demo » : vérifié, leur page `/games/play/` répond 404 chez le studio.
 * Les écarter ici les fait compter comme « écartés » dans le journal du runner
 * au lieu de les faire échouer un par un.
 */
const ENVELOPPE = /pushgaming\.com\/games\/play\//;

/** L'hôte du lanceur, à l'intérieur de l'iframe. Le seul en service. */
const CADRE_DU_JEU = /player\.[a-z0-9-]+\.demo\.pushgaming\.com/;

/**
 * L'avis de restriction géographique de CloudFront, dans le cadre du jeu.
 *
 * Les deux marques sont exigées ensemble, comme pour la limite de débit de
 * BGaming : « 403 ERROR » seul pourrait venir d'un asset manquant du jeu, et la
 * phrase sur le pays pourrait un jour se lire dans un texte de conditions. Les
 * deux côte à côte ne sont que cette page-là.
 */
const GEO_BLOQUE = /403\s*ERROR/i;
const GEO_BLOQUE_MOTIF = /block\s+access\s+from\s+your\s+country/i;

/** Le cadre qui porte le jeu, quand l'iframe a reçu son vrai `src`. */
function cadreDuJeu(page: Page) {
  return page.frames().find((f) => CADRE_DU_JEU.test(f.url())) ?? null;
}

export const PUSH_GAMING: Adaptateur = {
  studio: 'push-gaming',

  /** Voir `ENVELOPPE` : les deux fiches restées sur la page produit n'ont rien. */
  demoExploitable: (url) => ENVELOPPE.test(url),

  /**
   * Trois secondes, et c'est volontairement trop peu pour un jeu.
   *
   * `capturer-jeux.ts` attend ce délai juste après le `goto(demoUrl)`, et
   * `demoUrl` est l'enveloppe : mesurée en `load` à 863, 940 et 1 049 ms sur
   * trois jeux, iframe pourvue de son vrai `src` 6 à 9 ms plus tard. Trois
   * secondes couvrent largement la mesure et sa marge.
   *
   * Le vrai chargement — celui du jeu dans le cadre — appartient à
   * `ouvrirLeJeu`, et il n'est **pas encore mesuré** : le lanceur ne s'est
   * jamais ouvert depuis ce poste. Ne pas le remplacer ici par un nombre pris
   * chez un autre studio : ce délai-ci porte sur l'enveloppe, pas sur le jeu.
   */
  chargementMs: 3_000,

  /**
   * Ouvre l'enveloppe, attend le cadre du jeu, et nomme le blocage s'il est là.
   *
   * On ne navigue **pas** vers l'URL décodée : le lanceur n'oppose ni
   * `x-frame-options` ni `frame-ancestors`, le jeu s'affiche donc parfaitement
   * dans l'iframe, qui occupe déjà 100 % de la page (l'enveloppe met
   * `#game-iframe` en `position:absolute` sur toute la surface). La géométrie
   * que `lireLesRegles` attend — un jeu plein cadre dans 1280×800 — est donc
   * obtenue sans rien recharger, contrairement au cas Hacksaw où le jeu est
   * encastré dans une page produit.
   */
  async ouvrirLeJeu(page) {
    /*
     * Le cadre est attaché en moins de 10 ms après le `load`, donc il est déjà
     * là quand on arrive ; la boucle n'existe que pour ne pas dépendre de cette
     * mesure si le studio passe un jour à un script différé.
     */
    let cadre = cadreDuJeu(page);
    for (let essai = 0; essai < 10 && !cadre; essai++) {
      await page.waitForTimeout(500);
      cadre = cadreDuJeu(page);
    }
    if (!cadre) {
      throw new Error("l'enveloppe Push Gaming n'a posé aucun cadre de jeu");
    }

    /*
     * Le contenu du cadre est lisible tout de suite : CloudFront refuse au bord
     * en 45 ms, il n'y a pas de course. Une lecture qui échoue — cadre détaché
     * pendant une navigation interne du jeu — n'est pas un blocage, on laisse
     * passer plutôt que de conclure.
     */
    const corps = await cadre.content().catch(() => '');
    if (GEO_BLOQUE.test(corps) && GEO_BLOQUE_MOTIF.test(corps)) {
      throw new Error(
        'démo géo-bloquée : CloudFront 403 sur player.eu.demo.pushgaming.com ' +
          "depuis une IP française. Ce n'est pas l'adaptateur — il faut une " +
          'sortie réseau hors de France. Voir l\'en-tête du fichier.',
      );
    }

    /*
     * À partir d'ici, plus rien n'est mesuré : on n'a jamais vu le jeu.
     *
     * Ce qui reste à trouver, dans l'ordre, le jour où le lanceur répond :
     * le temps de chargement réel du moteur, l'écran d'accueil éventuel et ce
     * qui le ferme, la position du bouton qui ouvre les règles, le nombre de
     * pages du panneau et le geste qui les fait défiler, puis la fermeture.
     * Tout cela se lit à l'écran, capture après capture — c'est la méthode des
     * trois adaptateurs existants, et elle ne se remplace pas par une supposition.
     */
  },

  /**
   * Rien à ouvrir tant que le jeu ne s'affiche pas.
   *
   * `0` remet le jeu en file sans rien publier, ce qui est exactement le
   * comportement voulu : le blocage est déjà nommé par `ouvrirLeJeu`, qui lève
   * avant d'arriver ici. Cette fonction n'est donc atteinte que si le lanceur
   * répond enfin — et c'est alors ici qu'il faut écrire la séquence trouvée à
   * l'œil, pas la deviner.
   */
  async capturerLesRegles() {
    return 0;
  },

  /**
   * On ne cherche pas d'achat de bonus à l'aveugle.
   *
   * Plusieurs titres du studio en proposent un chez les opérateurs, mais on
   * n'a jamais vu leur démo : cliquer à une position supposée produirait une
   * image du jeu de base légendée « Buying the feature », la faute précise que
   * le contrôle `/BUY/i` de l'adaptateur Pragmatic existe pour empêcher.
   */
  async capturerLAchat() {
    return false;
  },
};
