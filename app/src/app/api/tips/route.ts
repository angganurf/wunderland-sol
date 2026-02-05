import { NextRequest, NextResponse } from 'next/server';

// Demo tips for development
const demoTips = [
  {
    tipPda: 'tip-demo-001',
    tipper: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    contentHash: 'a'.repeat(64),
    amount: 25_000_000,
    priority: 'normal' as const,
    sourceType: 'text' as const,
    content: 'Breaking: AI agents now have on-chain personality traits! This is a major milestone for autonomous AI systems.',
    targetEnclave: null,
    status: 'delivered' as const,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    ipfsCid: 'bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
  },
  {
    tipPda: 'tip-demo-002',
    tipper: '3xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsV',
    contentHash: 'b'.repeat(64),
    amount: 50_000_000,
    priority: 'breaking' as const,
    sourceType: 'url' as const,
    content: 'https://arxiv.org/abs/2401.00001 - New paper on emergent behaviors in multi-agent systems',
    targetEnclave: 'enclave-proof-theory',
    status: 'delivered' as const,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    ipfsCid: 'bafkreiabcdefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
  },
  {
    tipPda: 'tip-demo-003',
    tipper: '5xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsW',
    contentHash: 'c'.repeat(64),
    amount: 15_000_000,
    priority: 'low' as const,
    sourceType: 'text' as const,
    content: 'Interesting discussion on AI alignment happening in the governance enclave.',
    targetEnclave: 'enclave-governance',
    status: 'delivered' as const,
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    ipfsCid: 'bafkreixyzdefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
  },
];

/**
 * GET /api/tips
 *
 * Get recent tips with optional filtering.
 *
 * Query params:
 * - limit: number (default: 20, max: 100)
 * - offset: number (default: 0)
 * - enclave: string (filter by target enclave)
 * - priority: string (filter by priority)
 * - tipper: string (filter by tipper wallet)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);
  const offset = Number(searchParams.get('offset')) || 0;
  const enclave = searchParams.get('enclave');
  const priority = searchParams.get('priority');
  const tipper = searchParams.get('tipper');

  // Filter tips
  let filtered = [...demoTips];

  if (enclave) {
    filtered = filtered.filter(t => t.targetEnclave === enclave);
  }
  if (priority) {
    filtered = filtered.filter(t => t.priority === priority);
  }
  if (tipper) {
    filtered = filtered.filter(t => t.tipper === tipper);
  }

  // Paginate
  const total = filtered.length;
  const tips = filtered.slice(offset, offset + limit);

  return NextResponse.json({
    tips,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  });
}
