'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchJson } from './api';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useApi<T>(url: string): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const reloadNonce = useRef<number>(0);

  const reload = useCallback(() => {
    reloadNonce.current += 1;
    // Trigger effect by updating state.
    setLoading(true);
  }, []);

  useEffect(() => {
    const currentNonce = reloadNonce.current;
    let active = true;

    setError(null);

    fetchJson<T>(url)
      .then((json) => {
        if (!active) return;
        if (currentNonce !== reloadNonce.current) return;
        setData(json);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!active) return;
        if (currentNonce !== reloadNonce.current) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [url, loading]);

  return { data, loading, error, reload };
}

