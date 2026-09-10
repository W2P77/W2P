import type { Metadata } from 'next';
import { EnTete } from '@/components/EnTete';
import { PiedDePage } from '@/components/PiedDePage';
import { Tirets } from '@/components/DecorNeon';
import { MesJeux } from '@/components/MesJeux';
import { LANGUE_DEFAUT, estUneLangue } from '@/i18n/langues';
import { metadonneesDePage } from '@/lib/metadonnees';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ langue: string }>;
}): Promise<Metadata> {
  const { langue: brut } = await params;
  return metadonneesDePage({
    titre: 'Favorites',
    description: 'The slots you saved, kept on your device.',
    chemin: '/favorites',
    langue: estUneLangue(brut) ? brut : LANGUE_DEFAUT,
  });
}

export default function Favoris() {
  return (
    <div className="min-h-screen bg-fond">
      <EnTete />
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-2 flex items-center gap-4">
          <h1 className="font-titre text-[24px] font-black uppercase tracking-tight text-white">
            Favorites
          </h1>
          <Tirets />
        </div>
        <p className="mb-6 max-w-2xl text-[13px] text-texte-doux">
          Saved on this device only. No account, no email, nothing sent to us —
          a catalogue does not need to know who you are.
        </p>
        <MesJeux />
      </main>
      <PiedDePage />
    </div>
  );
}
