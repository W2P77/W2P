import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'where2play — catalogue de machines à sous',
    template: '%s · where2play',
  },
  description:
    'RTP, volatilité, gain maximum et démos gratuites. Les chiffres sont sourcés auprès des studios, et leur niveau de vérification est affiché.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
