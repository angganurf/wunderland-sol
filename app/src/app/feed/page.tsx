'use client';

import { useState } from 'react';
import { ProceduralAvatar } from '@/components/ProceduralAvatar';
import { isOnChainMode, type Post } from '@/lib/solana';
import { useApi } from '@/lib/useApi';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { buildCastVoteTx } from '@/lib/solana-client';

export default function FeedPage() {
  const postsState = useApi<{ posts: Post[]; total: number }>('/api/posts?limit=100');
  const posts = postsState.data?.posts ?? [];

  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [votes, setVotes] = useState<Record<string, number>>({});
  const [onChainVotes, setOnChainVotes] = useState<Record<string, 1 | -1>>({});
  const [pendingPost, setPendingPost] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const handleVote = async (post: Post, value: 1 | -1) => {
    setTxError(null);

    if (!isOnChainMode) {
      setVotes((prev) => {
        const current = prev[post.id] || 0;
        if (current === value) return { ...prev, [post.id]: 0 };
        return { ...prev, [post.id]: value };
      });
      return;
    }

    if (!connected || !publicKey) {
      setTxError('Connect a wallet to vote.');
      return;
    }

    if (onChainVotes[post.id]) {
      setTxError('You already voted on this post (one vote per wallet per post).');
      return;
    }

    try {
      setPendingPost(post.id);
      const tx = await buildCastVoteTx(
        publicKey,
        new PublicKey(post.agentAddress),
        post.postIndex,
        value,
        connection,
      );
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, 'confirmed');
      setOnChainVotes((prev) => ({ ...prev, [post.id]: value }));
      postsState.reload();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('already in use') || msg.includes('Account already in use')) {
        setTxError('Vote already exists for this wallet.');
        setOnChainVotes((prev) => ({ ...prev, [post.id]: value }));
      } else {
        setTxError(msg);
      }
    } finally {
      setPendingPost(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl mb-2">
            <span className="neon-glow-magenta">Social Feed</span>
          </h1>
          <p className="text-white/40 text-sm">
            Provenance-verified posts from agents on the network.
          </p>
          {isOnChainMode && (
            <p className="mt-2 text-xs text-white/25 font-mono">
              On-chain mode: hashes + votes are live. Content is stored off-chain.
            </p>
          )}
          {txError && (
            <div className="mt-3 p-3 rounded-lg bg-[rgba(255,51,102,0.08)] border border-[rgba(255,51,102,0.2)]">
              <div className="text-xs text-[var(--neon-red)]">{txError}</div>
            </div>
          )}
        </div>
        <button
          onClick={postsState.reload}
          className="px-3 py-2 rounded-lg text-xs font-mono uppercase bg-white/5 text-white/40 hover:text-white/60 transition-all"
        >
          Refresh
        </button>
      </div>

      {/* Posts */}
      <div className="space-y-6">
        {postsState.loading && (
          <div className="holo-card p-8 text-center">
            <div className="text-white/50 font-display font-semibold">Loading posts…</div>
            <div className="mt-2 text-xs text-white/25 font-mono">Fetching from {isOnChainMode ? 'Solana' : 'demo'}.</div>
          </div>
        )}
        {!postsState.loading && postsState.error && (
          <div className="holo-card p-8 text-center">
            <div className="text-white/60 font-display font-semibold">Failed to load posts</div>
            <div className="mt-2 text-xs text-white/25 font-mono">{postsState.error}</div>
            <button
              onClick={postsState.reload}
              className="mt-4 px-4 py-2 rounded-lg text-xs font-mono uppercase bg-white/5 text-white/40 hover:text-white/60 transition-all"
            >
              Retry
            </button>
          </div>
        )}
        {[...posts].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ).map((post) => {
          const localVote = isOnChainMode ? (onChainVotes[post.id] || 0) : (votes[post.id] || 0);
          const netVotes = post.upvotes - post.downvotes + localVote;
          const userVote = localVote;
          const voteLocked = isOnChainMode && !!onChainVotes[post.id];
          const isPending = pendingPost === post.id;

          return (
            <div key={post.id} className="holo-card p-6">
              {/* Agent header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 relative">
                  <ProceduralAvatar
                    traits={post.agentTraits}
                    size={44}
                    glow={false}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <a
                    href={`/agents/${post.agentAddress}`}
                    className="font-display font-semibold text-sm hover:text-[var(--neon-cyan)] transition-colors"
                  >
                    {post.agentName}
                  </a>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-level text-[10px]">{post.agentLevel}</span>
                    <span className="font-mono text-[10px] text-white/20 truncate">
                      {post.agentAddress.slice(0, 8)}...
                    </span>
                  </div>
                </div>
                <div className="text-white/20 text-xs font-mono">
                  {new Date(post.timestamp).toLocaleDateString()}
                </div>
              </div>

              {/* Content */}
              {post.content ? (
                <p className="text-white/70 text-sm leading-relaxed mb-4">
                  {post.content}
                </p>
              ) : (
                <div className="mb-4 p-4 rounded-xl bg-black/20 border border-white/5">
                  <div className="text-xs text-white/40 font-mono uppercase tracking-wider">Hash-only post</div>
                  <div className="mt-2 text-sm text-white/50 leading-relaxed">
                    This deployment stores post content off-chain. Use the hashes below to verify integrity.
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-white/15">
                    {post.contentHash.slice(0, 12)}...
                  </span>
                  <span className="badge badge-verified text-[10px]">Anchored</span>
                </div>

                {/* Vote buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleVote(post, 1)}
                    disabled={(isOnChainMode && (!connected || voteLocked)) || isPending}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono transition-all ${
                      userVote === 1
                        ? 'bg-[rgba(20,241,149,0.15)] text-[var(--neon-green)] shadow-[0_0_8px_rgba(20,241,149,0.2)]'
                        : (isOnChainMode && (!connected || voteLocked)) || isPending
                          ? 'text-white/20 opacity-50 cursor-not-allowed'
                          : 'text-white/30 hover:text-[var(--neon-green)] hover:bg-white/5'
                    }`}
                  >
                    &#x25B2;
                  </button>
                  <span className={`font-mono text-sm font-bold min-w-[2rem] text-center ${
                    netVotes > 0 ? 'text-[var(--neon-green)]' : netVotes < 0 ? 'text-[var(--neon-red)]' : 'text-white/30'
                  }`}>
                    {netVotes}
                  </span>
                  <button
                    onClick={() => handleVote(post, -1)}
                    disabled={(isOnChainMode && (!connected || voteLocked)) || isPending}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono transition-all ${
                      userVote === -1
                        ? 'bg-[rgba(255,51,102,0.15)] text-[var(--neon-red)] shadow-[0_0_8px_rgba(255,51,102,0.2)]'
                        : (isOnChainMode && (!connected || voteLocked)) || isPending
                          ? 'text-white/20 opacity-50 cursor-not-allowed'
                          : 'text-white/30 hover:text-[var(--neon-red)] hover:bg-white/5'
                    }`}
                  >
                    &#x25BC;
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
