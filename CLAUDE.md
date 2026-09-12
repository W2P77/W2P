# where2spin — à lire avant toute chose

Catalogue de machines à sous en 3 langues (`en` défaut, `fr`, `de`), 11 658
fiches dont **1 090 publiées**. La promesse tient en une phrase : **chaque
chiffre dit d'où il vient**. C'est le seul avantage sur les agrégateurs, et il
se perd au premier chiffre inventé.

## Stack

| | |
|---|---|
| Cadre | **Next.js 15.5** App Router · React 19 · TypeScript |
| Base | **Prisma 7** → PostgreSQL Supabase · adaptateur `PrismaPg` |
| Captures | **Playwright** + **Tesseract** (OCR) · stockage Supabase |
| Tracking | **Upstash Redis**, partagé avec BetsRank |
| Tests | **Vitest** — `npm run verify` avant tout commit |
| Build | Vercel, projet `w2-p`, compte **`w2p77`** (pas celui de BetsRank) |

## La chaîne qui décide de tout

Une fiche n'est publiée que si elle a **un RTP et au moins une capture**
(`src/lib/publication.ts`). D'où l'enchaînement, à connaître par cœur :

> **pas de `demoUrl` → pas de capture → pas de publication**

Et une capture demande **un adaptateur pour le studio**. Chaque maillon a sa
panne propre, et aucune ne lève d'exception.

**Les adaptateurs sont le facteur limitant.** Il y en a 9 (`src/lib/captures/
adaptateurs.ts`) : pragmatic-play, hacksaw-gaming, bgaming, playn-go,
push-gaming, wazdan, evoplay, red-tiger, netent. **4 101 fiches ont une démo et
attendent le leur.**

## Les règles qui ne se négocient pas

- **On n'invente rien.** Un chiffre est lu à la source ou absent. Une date
  approximative est pire que pas de date — le bloc « Dernières sorties » vend la
  fraîcheur. Le projet a déjà été mordu par des centaines de fiches datées au
  1ᵉʳ janvier par défaut.
- **Le panneau du jeu fait autorité** sur la fiche produit, qui fait autorité
  sur l'import. Mais un **écart n'est jamais écrasé en silence** : il est
  signalé, parce qu'il veut presque toujours dire qu'autre chose est faux.
- **Tout est écrit en français** : noms, commentaires, messages. Les commentaires
  expliquent **pourquoi**, jamais quoi — ils sont la mémoire des pièges payés.
- `npm run verify` **et** une entrée `CHANGELOG.md` dans le même commit.
- Sauvegarder toute écriture en base dans `~/Documents/GitHub/sauvegardes-betsrank/`,
  jamais dans `/tmp`, qui s'efface en cours de journée.

## Les cinq garde-fous des scripts de démos

Chacun a évité une erreur réelle. Les reprendre dans tout nouveau script.

1. **Un code 200 ne prouve rien.** Chez Red Tiger, NetEnt et Nolimit City,
   `/demo/<n'importe quoi>` répond 200 **à l'octet près**. Chez Hacksaw, un
   identifiant inventé sert un vrai jeu — leur gabarit interne, « Slottemplate ».
   La seule preuve est une donnée lue dans la page du jeu lui-même.
2. **Confronter le nom de la page à celui de la base.** `netent.com/games/
   victorious/` annonce aujourd'hui « Victorious MAX™ », un autre jeu, en gardant
   l'ancien identifiant. Chez Nolimit City, le slug `game-1` mène à « Fire In The
   Hole 4 ».
3. **Deux fiches ne partagent jamais un lanceur.** Sinon c'est un doublon de
   catalogue : garder le premier par ordre de slug, rapporter l'autre.
4. **Lire le catalogue du studio AVANT de sonder les fiches.** Un script a sondé
   145 fiches d'abord, s'est fait repousser, a reçu une liste vide et **déclaré
   58 jeux retirés** alors qu'ils étaient tous en ligne.
5. **Se méfier de ce qui réussit sans rien faire.** Le lanceur Wazdan répond 301
   vers sa fiche marketing dès que l'User-Agent contient « Headless » : la page
   charge, `load` se produit, rien n'échoue — et on photographie le site du
   studio en croyant filmer un jeu.

## Pièges déjà payés

### Exploitation
- **Une campagne de captures à la fois.** À trois en parallèle, le poste monte à
  `load 23`, les jeux ne chargent plus à temps, et le journal rend « icône des
  règles introuvable » — le symptôme d'un adaptateur cassé. BGaming a publié
  2 jeux sur 107 ainsi, puis 11 et 10 captures relancé seul.
- **Un build Vercel raté ne met rien hors ligne** : Vercel garde le dernier
  réussi, le site répond 200 sur une vieille version. Après un push, vérifier
  qu'un **contenu qui n'existait pas avant** est servi.
- **Un fichier non suivi par git casse le build distant** et passe le typecheck
  local, qui lit le disque et non l'index. Arrivé **deux fois le même jour**.
  Après un `git add` sélectif : relire `git status --short`, puis `npm run build`.
- **`public/` n'existe pas dans une fonction serverless.** `existsSync` y rend
  toujours faux : le site n'a **jamais** déclaré d'`og:image` en production. Ces
  fichiers se chargent par URL, pas par le disque.
- **Satori ne décode pas le WebP** et ne le signale pas. Les 1 855 jaquettes
  étant en `.webp`, aucune carte de partage n'en a jamais montré une.

### Données
- **Le RTP d'un achat de bonus n'est pas celui du jeu.** Sur huit titres
  mesurés, six portaient en base le retour d'un achat.
- **Une section « Volatility Levels » décrit un réglage, pas le jeu.** Chez
  Wazdan, l'y lire aurait étiqueté **259 fiches sur 261** en « volatilité haute ».
- **Deux slugs voisins ne sont pas forcément le même jeu.** `pirate-gold-slot` et
  `pirates-riches` partagent un `gameSymbol` et sont deux titres distincts : l'un
  portait la démo de l'autre.
- **Les captures sont adossées au RTP** : leurs légendes portent le chiffre.
  Déplacer une capture vers une fiche qui annonce autre chose publierait la
  contradiction en image.
- **Les métadonnées de source ne voyagent qu'avec le RTP qu'elles attestent.**

### Tracking
- **`bce:clicks:<jour>` est une STRING** contenant un tableau JSON, pas une liste
  Redis. Un `lpush` y échoue en silence — aucun clic where2spin n'a été
  enregistré pendant toute la mise en place.
- **L'IP ne va jamais dans le champ `ip`** mais dans `ipVisiteur` : le postback,
  s'il trouve une `ip`, attribue la conversion via `getAffiliateByIp`. where2spin
  n'ayant pas d'affiliés, ce repli ne peut que se tromper — il a crédité un REG à
  un affilié au premier essai.
- La notification Discord et l'enregistrement du clic sont **deux chemins
  indépendants** : voir la notif tomber ne prouve rien sur l'attribution.

## Deux studios géo-bloqués depuis la France

**Push Gaming** (CloudFront 403) et **Endorphina** (« Forbidden For Your
Region »). Ce n'est pas un problème de code : il faut une sortie réseau hors de
France. L'adaptateur Push Gaming est branché exprès pour que le journal dise
« démo géo-bloquée » au lieu de « icône des règles introuvable ».

**Synot ne publie aucune démo publique** — vérifié exhaustivement, consigné dans
`scripts/extraire-demos-tada-synot-spinoro-1spin4win.ts`. Ne pas refaire le tour.

## Deux comptes Vercel

`w2-p` est sur le compte **`w2p77`**, BetsRank sur `picsougambling-dot`. Un
`vercel login` sur l'un déconnecte l'autre. Et **répondre `n`** à « Pull
development environment variables » : un pull écrase le `.env.local` par des
`[SENSITIVE]`.

## Commandes

```
npm run verify                                    typecheck + lint + tests
npx tsx --env-file=.env.local scripts/<x>.ts      tout script (jamais `node` nu)
npx tsx scripts/capturer-jeux.ts --studio <s> --limite N [--appliquer]
```

Les scripts sont en **simulation par défaut** ; `--appliquer` écrit. Sauvegarder
avant.

## Où chercher

`CHANGELOG.md` — le carnet de bord : ce qui a été fait, pourquoi, et les pièges.
C'est lui qu'il faut lire avant de rouvrir un sujet.
