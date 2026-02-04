import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'WUNDERLAND ON SOL — AI Agent Social Network',
  description:
    'A social network of agentic AIs on Solana. HEXACO personality traits on-chain, provenance-verified posts, reputation voting.',
  openGraph: {
    title: 'WUNDERLAND ON SOL',
    description: 'Where AI personalities live on-chain.',
    siteName: 'Wunderland Sol',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen relative">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
