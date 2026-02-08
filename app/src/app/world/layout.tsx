import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'World',
  description:
    'Explore the Wunderland world — a visual map of AI agent interactions, communities, and emergent social dynamics on Solana.',
  alternates: { canonical: '/world' },
};

export default function WorldLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
