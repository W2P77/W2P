/**
 * L'anglais ne revient pas par la porte de derrière.
 *
 * ── Pourquoi ce test existe ───────────────────────────────────────────────
 *
 * Le site parle trois langues, mais une partie de son interface était écrite
 * en dur dans les composants : les étiquettes de la fiche (« Provider »,
 * « Max win », « Bonus buy »), les filtres du catalogue, le pied de page, les
 * pages d'avis et de nouveautés. Un visiteur en français lisait l'anglais sur
 * la moitié de l'écran — et rien ne le signalait, parce qu'une chaîne en dur
 * compile parfaitement.
 *
 * Ce test relit les composants et les pages comme un correcteur : toute
 * chaîne destinée à l'écran qui porte deux mots anglais courants le fait
 * échouer. La réponse est toujours la même — poser la chaîne dans
 * `src/i18n/textes.ts`, où le typage force les trois langues.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { textes } from '../../i18n/textes';
import { LANGUES } from '../../i18n/langues';
import { GUIDES } from '../../data/guides';

const MOTS_ANGLAIS =
  /\b(the|and|of|with|your|our|free|every|from|that|which|when|where|are|is|for|not|more|than|only|just|also|each|about|before|after|here|below|search|read|browse|new|releases|favorites|provider|providers|volatility|games?|slots?|casinos?|play|show|see|all|previous|next|guides|demos|partners?|commission|studio-verified|min read|arrow keys|bonus buy)\b/i;

/** Ce qui n'est pas de la langue : la marque, et un nom propre de partenaire. */
const HORS_LANGUE = new Set(['where2spin', 'BeGambleAware.org', 'Name A-Z']);

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return nom === '__tests__' ? [] : fichiers(chemin);
    return chemin.endsWith('.tsx') ? [chemin] : [];
  });
}

function chainesAffichees(source: string): string[] {
  // Les commentaires sont en français, volontairement : ils ne comptent pas.
  const sansCommentaires = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\/[^\n]*/g, '');
  const attributs = [...sansCommentaires.matchAll(/(?:libelle|label|aria-label|placeholder|alt|title)=["']([^"']{4,90})["']/g)];
  /*
   * Le piège que ce test a laissé passer une fois : un nœud JSX qui MÊLE une
   * interpolation et des mots écrits en dur — « {total} games », « Show {n}
   * more partners », « {g.minutes} min read ». En excluant les accolades, la
   * capture les ignorait tous. On les prend donc, puis on retire les
   * interpolations pour ne juger que le texte qui reste.
   */
  const texteJsx = [...sansCommentaires.matchAll(/>([^<>]{1,200})</g)]
    .map((m) => m[1].replace(/\{[^{}]*\}/g, ' '))
    // Ce qui porte du code n'est pas de la prose : une capture entre deux
    // chevrons peut tomber sur un générique TypeScript ou une comparaison.
    .filter((texte) => !/[;=()[\]|&`$]/.test(texte));
  return [...attributs.map((m) => m[1]), ...texteJsx].map((c) => c.trim()).filter(Boolean);
}

describe('trois langues, partout', () => {
  it('aucune chaîne anglaise écrite en dur dans les composants et les pages', () => {
    const fautes: string[] = [];
    for (const dossier of ['src/components', 'src/app']) {
      for (const f of fichiers(dossier)) {
        for (const chaine of chainesAffichees(readFileSync(f, 'utf8'))) {
          if (HORS_LANGUE.has(chaine) || chaine.startsWith('http')) continue;
          if ((chaine.match(MOTS_ANGLAIS) ?? []).length && MOTS_ANGLAIS.test(chaine)) {
            fautes.push(`${f} : « ${chaine} »`);
          }
        }
      }
    }
    expect(fautes).toEqual([]);
  });

  /*
   * Le repli anglais de `contenuDuGuide` est un filet, pas une destination :
   * trois des quatre guides sont restés en anglais pour un lecteur français
   * pendant des semaines sans que rien ne le signale, parce que le repli
   * compile et s'affiche.
   */
  it('chaque guide existe dans les trois langues', () => {
    const manquants = GUIDES.flatMap((g) =>
      LANGUES.filter(({ code }) => !g.contenu[code]).map(({ code }) => `${g.slug} : ${code}`),
    );
    expect(manquants).toEqual([]);
  });

  it('aucune valeur vide dans les trois langues', () => {
    for (const { code } of LANGUES) {
      for (const [cle, valeur] of Object.entries(textes(code))) {
        expect(valeur, `${code}.${cle}`).not.toBe('');
      }
    }
  });

  /*
   * Une traduction oubliée se voit à l'article anglais resté dedans : « the »,
   * « and », « with » n'existent ni en français ni en allemand.
   */
  it('ni « the » ni « and » dans les textes français et allemands', () => {
    const suspects: string[] = [];
    for (const code of ['fr', 'de'] as const) {
      for (const [cle, valeur] of Object.entries(textes(code))) {
        if (HORS_LANGUE.has(valeur)) continue;
        if (/\b(the|and|with|your|every|comes from|max win)\b/i.test(valeur)) suspects.push(`${code}.${cle} : « ${valeur} »`);
      }
    }
    expect(suspects).toEqual([]);
  });
});
