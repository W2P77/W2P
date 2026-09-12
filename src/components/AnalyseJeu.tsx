import { sectionsAnalyse, questionsFrequentes, type FaitsDuJeu } from '@/lib/analyse-jeu';
import type { Langue } from '@/i18n/langues';
import { textes } from '@/i18n/textes';

/**
 * Le texte d'analyse, sous la liste des casinos.
 *
 * Il vient **après** le bloc « Où jouer » : le visiteur qui est venu chercher
 * une adresse l'a déjà trouvée, et celui qui veut comprendre le jeu continue
 * de lire. Mettre le texte avant ferait descendre les partenaires sous la
 * ligne de flottaison sur mobile.
 */
export function AnalyseJeu({ faits, langue }: { faits: FaitsDuJeu; langue: Langue }) {
  const t = textes(langue);
  const sections = sectionsAnalyse(faits, langue);
  const questions = questionsFrequentes(faits, langue);
  if (!sections.length && !questions.length) return null;

  return (
    <section className="biseau mt-6 border border-fond-bordure bg-fond-panneau p-5">
      <h2 className="font-titre text-[19px] font-extrabold uppercase tracking-wide text-white">
        {t.analyseTitre}
      </h2>

      <div className="mt-4 space-y-6">
        {sections.map((s) => (
          <div key={s.titre}>
            <h3 className="font-titre text-[15px] font-bold uppercase tracking-wide text-neon-cyan">
              {s.titre}
            </h3>
            {s.paragraphes.map((p) => (
              <p key={p} className="mt-2 max-w-3xl font-corps text-[13px] leading-relaxed text-texte-doux">
                {p}
              </p>
            ))}
          </div>
        ))}
      </div>

      {questions.length > 0 && (
        <div className="mt-8 border-t border-fond-bordure pt-6">
          <h3 className="font-titre text-[15px] font-bold uppercase tracking-wide text-white">
            {t.faqTitre}
          </h3>
          <dl className="mt-3 space-y-4">
            {questions.map((q) => (
              <div key={q.question}>
                <dt className="font-ui text-[13px] font-semibold text-texte">{q.question}</dt>
                <dd className="mt-1 max-w-3xl font-corps text-[13px] leading-relaxed text-texte-doux">
                  {q.reponse}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
