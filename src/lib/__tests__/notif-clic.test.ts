/**
 * La notification d'un clic ne retient jamais le visiteur.
 *
 * Elle part d'une page de sortie : si le jeton manque, si le salon est
 * introuvable, si Discord répond mal, le départ vers le partenaire doit avoir
 * lieu quand même. Ces tests fixent ce contrat — renoncer, jamais lever.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

import { notifierClicDiscord } from '../discord/notif-clic';

const CLIC = { casinoNom: 'Betti', casinoSlug: 'betti', clickId: 'w2p-abc', jeu: 'sweet-bonanza' };

/* Les deux chemins coexistent : on neutralise l'un pour tester l'autre. */
const SANS_WEBHOOK = () => vi.stubEnv('DISCORD_WEBHOOK_CLICS', '');
const SANS_BOT = () => {
  vi.stubEnv('DISCORD_GUILD_ID', '');
  vi.stubEnv('DISCORD_BOT_TOKEN', '');
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('notification Discord d’un clic sortant', () => {
  it('renonce sans serveur configuré, sans lever', async () => {
    SANS_WEBHOOK();
    vi.stubEnv('DISCORD_GUILD_ID', '');
    await expect(notifierClicDiscord(CLIC)).resolves.toBe(false);
  });

  it('renonce quand Discord refuse, sans lever', async () => {
    SANS_WEBHOOK();
    vi.stubEnv('DISCORD_GUILD_ID', '123');
    vi.stubEnv('DISCORD_BOT_TOKEN', 'jeton');
    vi.stubEnv('DISCORD_SALON_FLUX_CLICS', '456');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    await expect(notifierClicDiscord(CLIC)).resolves.toBe(false);
  });

  it('renonce quand le réseau tombe, sans lever', async () => {
    SANS_WEBHOOK();
    vi.stubEnv('DISCORD_GUILD_ID', '123');
    vi.stubEnv('DISCORD_BOT_TOKEN', 'jeton');
    vi.stubEnv('DISCORD_SALON_FLUX_CLICS', '456');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('réseau')));
    await expect(notifierClicDiscord(CLIC)).resolves.toBe(false);
  });

  it('poste dans le salon et marque le site', async () => {
    SANS_WEBHOOK();
    vi.stubEnv('DISCORD_GUILD_ID', '123');
    vi.stubEnv('DISCORD_BOT_TOKEN', 'jeton');
    vi.stubEnv('DISCORD_SALON_FLUX_CLICS', '456');
    const envoi = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'm1' }) });
    vi.stubGlobal('fetch', envoi);
    await expect(notifierClicDiscord(CLIC)).resolves.toBe(true);
    const [url, init] = envoi.mock.calls[0];
    expect(url).toContain('/channels/456/messages');
    const corps = JSON.parse((init as RequestInit).body as string);
    expect(corps.embeds[0].fields[0]).toEqual({ name: 'Site', value: '🔷 where2spin', inline: true });
    expect(corps.embeds[0].fields.at(-1).value).toContain('w2p-');
  });
});

/*
 * Le webhook est le chemin réellement utilisé en production : le jeton du bot
 * n'est lisible nulle part, et le régénérer ferait tomber celui de BetsRank.
 */
describe('le chemin webhook', () => {
  it('envoie sur l’URL du webhook, sans jeton ni serveur', async () => {
    SANS_BOT();
    vi.stubEnv('DISCORD_WEBHOOK_CLICS', 'https://discord.com/api/webhooks/1/xyz');
    const faux = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', faux);

    await expect(notifierClicDiscord(CLIC)).resolves.toBe(true);
    expect(faux).toHaveBeenCalledTimes(1);
    const [url, init] = faux.mock.calls[0];
    expect(url).toBe('https://discord.com/api/webhooks/1/xyz');
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('marque la source dans le message', async () => {
    SANS_BOT();
    vi.stubEnv('DISCORD_WEBHOOK_CLICS', 'https://discord.com/api/webhooks/1/xyz');
    const faux = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', faux);

    await notifierClicDiscord(CLIC);
    const corps = JSON.parse(faux.mock.calls[0][1].body);
    const embed = corps.embeds[0];
    expect(embed.color).toBe(0x2fd8f5);
    expect(embed.fields[0]).toEqual({ name: 'Site', value: '🔷 where2spin', inline: true });
    expect(JSON.stringify(embed)).toContain('w2p-abc');
  });

  it('retombe sur le bot quand le webhook échoue', async () => {
    vi.stubEnv('DISCORD_WEBHOOK_CLICS', 'https://discord.com/api/webhooks/1/xyz');
    vi.stubEnv('DISCORD_GUILD_ID', '123');
    vi.stubEnv('DISCORD_BOT_TOKEN', 'jeton');
    vi.stubEnv('DISCORD_SALON_FLUX_CLICS', '456');
    const faux = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: '1' }) });
    vi.stubGlobal('fetch', faux);

    await expect(notifierClicDiscord(CLIC)).resolves.toBe(true);
    expect(faux).toHaveBeenCalledTimes(2);
    expect(faux.mock.calls[1][1].headers.Authorization).toBe('Bot jeton');
  });

  it('renonce sans lever quand le webhook tombe et qu’il n’y a pas de bot', async () => {
    SANS_BOT();
    vi.stubEnv('DISCORD_WEBHOOK_CLICS', 'https://discord.com/api/webhooks/1/xyz');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('réseau')));
    await expect(notifierClicDiscord(CLIC)).resolves.toBe(false);
  });
});
