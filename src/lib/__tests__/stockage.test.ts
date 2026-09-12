/**
 * Un refus passager ne doit pas coûter une campagne entière.
 *
 * Une campagne de 261 jeux est morte à la quatorzième sur un 502 de Supabase,
 * emportant les treize captures déjà faites — treize minutes de navigateur
 * perdues pour une seconde de panne. Ces tests fixent ce qui se rejoue et ce
 * qui ne se rejoue pas.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

/*
 * Les réponses sont des fabriques, pas des objets : le corps d'une `Response`
 * ne se lit qu'une fois, et réutiliser la même dans une boucle de réessais
 * faisait échouer le second `.text()` — le test mesurait alors sa propre
 * erreur au lieu de celle du code.
 */
async function televerserAvec(reponses: Array<() => Response | Error>) {
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'cle');
  const appels = vi.fn();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      const r = reponses[Math.min(appels.mock.calls.length, reponses.length - 1)]();
      appels();
      if (r instanceof Error) throw r;
      return r;
    }),
  );
  const { televerser } = await import('../visuels/stockage');
  const fichier = new URL('./stockage.test.ts', import.meta.url).pathname;
  return { promesse: televerser(fichier, 'x.webp'), appels };
}

const ok = () => () => new Response('', { status: 200 });
const echec = (statut: number) => () => new Response('boom', { status: statut });

describe('le téléversement', () => {
  it('n’essaie qu’une fois quand tout va bien', async () => {
    const { promesse, appels } = await televerserAvec([ok()]);
    await expect(promesse).resolves.toContain('x.webp');
    expect(appels).toHaveBeenCalledTimes(1);
  });

  it('rejoue un 502 et réussit au second essai', async () => {
    const { promesse, appels } = await televerserAvec([echec(502), ok()]);
    await expect(promesse).resolves.toContain('x.webp');
    expect(appels).toHaveBeenCalledTimes(2);
  }, 20_000);

  it('rejoue aussi une coupure réseau', async () => {
    const { promesse, appels } = await televerserAvec([() => new Error('socket hang up'), ok()]);
    await expect(promesse).resolves.toContain('x.webp');
    expect(appels).toHaveBeenCalledTimes(2);
  }, 20_000);

  /*
   * Un refus d'identité ne deviendra pas vrai en le répétant : le rejouer
   * trois fois ne ferait que retarder le diagnostic de trois reculs.
   */
  it('n’insiste pas sur un refus définitif', async () => {
    const { promesse, appels } = await televerserAvec([echec(403)]);
    await expect(promesse).rejects.toThrow(/refusé \(403\)/);
    expect(appels).toHaveBeenCalledTimes(1);
  });

  it('abandonne en nommant la dernière cause', async () => {
    const { promesse } = await televerserAvec([echec(502)]);
    await expect(promesse).rejects.toThrow(/abandonné après 4 essais.*502/s);
  }, 40_000);
});
