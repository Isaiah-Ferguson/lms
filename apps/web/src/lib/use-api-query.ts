"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { ApiError } from "@/lib/api/core";

export interface ApiQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Shared data-fetching hook for the common "load on mount (and when deps
 * change)" pattern. Handles loading/error state, redirects to /login when
 * there is no session (same behavior as useAuthedToken), and guards against
 * stale responses with a request counter so a slow, superseded request can
 * never overwrite the result of a newer one.
 *
 * The fetcher does not need to be memoized — the query re-runs only when
 * `deps` change (or when `reload()` is called), and always uses the latest
 * fetcher.
 */
export function useApiQuery<T>(
  fetcher: (token: string) => Promise<T>,
  deps: unknown[]
): ApiQueryResult<T> {
  const router = useRouter();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Bumped on each fetch so a stale response can't overwrite a newer one.
  const reqRef = useRef(0);

  // Always call the latest fetcher without making it an effect dependency.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const reqId = ++reqRef.current;
    setLoading(true);
    setError(null);

    fetcherRef.current(token)
      .then((result) => {
        if (reqId === reqRef.current) setData(result);
      })
      .catch((err) => {
        if (reqId !== reqRef.current) return;
        setError(
          err instanceof ApiError
            ? err.detail
            : "Something went wrong. Please try again."
        );
      })
      .finally(() => {
        if (reqId === reqRef.current) setLoading(false);
      });
    // The caller-supplied deps array is intentionally spread here — it plays
    // the same role as the deps argument of useEffect itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, reloadKey, ...deps]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return { data, loading, error, reload };
}
