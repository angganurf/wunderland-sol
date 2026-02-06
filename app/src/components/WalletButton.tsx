'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  broadcastWalletAddress,
  getWalletProvider,
  readStoredWalletAddress,
  shortAddress,
  storeWalletAddress,
} from '@/lib/wallet';

function syncWalletAddress(address: string): void {
  storeWalletAddress(address);
  broadcastWalletAddress(address);
}

export function WalletButton() {
  const [available, setAvailable] = useState(false);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshFromProvider = useCallback(() => {
    const provider = getWalletProvider();
    if (!provider) {
      setAvailable(false);
      setAddress('');
      return;
    }
    setAvailable(true);
    const nextAddress = provider.publicKey?.toBase58() || readStoredWalletAddress();
    setAddress(nextAddress);
    syncWalletAddress(nextAddress);
  }, []);

  useEffect(() => {
    refreshFromProvider();

    const provider = getWalletProvider();
    if (!provider?.on || !provider?.removeListener) return;

    const onConnect = () => refreshFromProvider();
    const onDisconnect = () => {
      setAddress('');
      syncWalletAddress('');
    };
    const onAccountChanged = () => refreshFromProvider();

    provider.on('connect', onConnect);
    provider.on('disconnect', onDisconnect);
    provider.on('accountChanged', onAccountChanged);

    return () => {
      provider.removeListener?.('connect', onConnect);
      provider.removeListener?.('disconnect', onDisconnect);
      provider.removeListener?.('accountChanged', onAccountChanged);
    };
  }, [refreshFromProvider]);

  const connectWallet = async () => {
    const provider = getWalletProvider();
    if (!provider) {
      setError('No Solana wallet detected');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await provider.connect();
      const nextAddress = res.publicKey.toBase58();
      setAddress(nextAddress);
      syncWalletAddress(nextAddress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wallet connection failed');
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = async () => {
    const provider = getWalletProvider();
    if (!provider) {
      setAddress('');
      syncWalletAddress('');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await provider.disconnect();
    } catch {
      // keep UI state deterministic even if provider throws
    } finally {
      setAddress('');
      syncWalletAddress('');
      setLoading(false);
    }
  };

  if (!available) {
    return (
      <span className="px-3 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider border bg-white/5 text-white/40 border-white/10">
        Wallet: Not Found
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {address ? (
        <button
          type="button"
          onClick={disconnectWallet}
          disabled={loading}
          className="px-3 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider border bg-[rgba(20,241,149,0.08)] text-[var(--neon-green)] border-[rgba(20,241,149,0.15)] hover:bg-[rgba(20,241,149,0.16)] disabled:opacity-60"
          title={address}
        >
          {loading ? 'Disconnecting...' : `Wallet ${shortAddress(address)}`}
        </button>
      ) : (
        <button
          type="button"
          onClick={connectWallet}
          disabled={loading}
          className="px-3 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider border bg-[rgba(0,194,255,0.08)] text-[var(--neon-cyan)] border-[rgba(0,194,255,0.2)] hover:bg-[rgba(0,194,255,0.16)] disabled:opacity-60"
        >
          {loading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
      {error && <span className="text-[10px] text-[var(--neon-red)]">{error}</span>}
    </div>
  );
}
