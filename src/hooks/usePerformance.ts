import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CACHE_CONFIG, PAGINATION_CONFIG } from "@/lib/performance-config";

interface ConnectionQuality {
  type: "fast" | "moderate" | "slow" | "offline";
  effectiveType: string;
  downlink: number;
  rtt: number;
}

/**
 * Hook to monitor connection quality
 */
export function useConnectionQuality(): ConnectionQuality {
  const [quality, setQuality] = useState<ConnectionQuality>({
    type: navigator.onLine ? "fast" : "offline",
    effectiveType: "4g",
    downlink: 10,
    rtt: 50,
  });

  useEffect(() => {
    const updateQuality = () => {
      const nav = navigator as Navigator & {
        connection?: {
          effectiveType: string;
          downlink: number;
          rtt: number;
        };
      };

      if (!navigator.onLine) {
        setQuality({
          type: "offline",
          effectiveType: "none",
          downlink: 0,
          rtt: 0,
        });
        return;
      }

      const conn = nav.connection;
      if (conn) {
        let type: ConnectionQuality["type"] = "fast";
        if (conn.effectiveType === "slow-2g" || conn.effectiveType === "2g") {
          type = "slow";
        } else if (conn.effectiveType === "3g") {
          type = "moderate";
        }

        setQuality({
          type,
          effectiveType: conn.effectiveType,
          downlink: conn.downlink,
          rtt: conn.rtt,
        });
      }
    };

    updateQuality();

    window.addEventListener("online", updateQuality);
    window.addEventListener("offline", updateQuality);

    const conn = (navigator as Navigator & { connection?: EventTarget })?.connection;
    if (conn) {
      conn.addEventListener("change", updateQuality);
    }

    return () => {
      window.removeEventListener("online", updateQuality);
      window.removeEventListener("offline", updateQuality);
      if (conn) {
        conn.removeEventListener("change", updateQuality);
      }
    };
  }, []);

  return quality;
}

/**
 * Hook for paginated data fetching with caching
 */
export function usePaginatedQuery<T>(
  queryKey: string[],
  fetchFn: (from: number, to: number) => Promise<{ data: T[]; count: number }>,
  options: {
    pageSize?: number;
    enabled?: boolean;
  } = {}
) {
  const { 
    pageSize = PAGINATION_CONFIG.DEFAULT_PAGE_SIZE, 
    enabled = true,
  } = options;

  const [page, setPage] = useState(0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...queryKey, page, pageSize],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const result = await fetchFn(from, to);

      return {
        items: result.data,
        totalCount: result.count,
        page,
        pageSize,
        totalPages: Math.ceil(result.count / pageSize),
      };
    },
    staleTime: CACHE_CONFIG.STALE_TIME_MS,
    gcTime: CACHE_CONFIG.CACHE_TIME_MS,
    enabled,
  });

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(0, newPage));
  }, []);

  const nextPage = useCallback(() => {
    if (data && page < data.totalPages - 1) {
      setPage((p) => p + 1);
    }
  }, [data, page]);

  const prevPage = useCallback(() => {
    if (page > 0) {
      setPage((p) => p - 1);
    }
  }, [page]);

  return {
    data: data?.items ?? [],
    totalCount: data?.totalCount ?? 0,
    page: data?.page ?? 0,
    pageSize,
    totalPages: data?.totalPages ?? 0,
    isLoading,
    error,
    refetch,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: data ? page < data.totalPages - 1 : false,
    hasPrevPage: page > 0,
  };
}

/**
 * Hook for infinite scroll with cursor-based pagination
 */
export function useInfiniteScroll<T extends { id: string; created_at?: string }>(
  queryKey: string[],
  fetchFn: (cursor: string | null, limit: number) => Promise<{ items: T[]; nextCursor: string | null }>,
  options: {
    limit?: number;
    enabled?: boolean;
  } = {}
) {
  const { limit = PAGINATION_CONFIG.DEFAULT_PAGE_SIZE, enabled = true } = options;

  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { isLoading: isInitialLoading, refetch } = useQuery({
    queryKey: [...queryKey, "initial"],
    queryFn: async () => {
      const result = await fetchFn(null, limit);
      setItems(result.items);
      setCursor(result.nextCursor);
      setHasMore(!!result.nextCursor);
      return result;
    },
    staleTime: CACHE_CONFIG.STALE_TIME_MS,
    gcTime: CACHE_CONFIG.CACHE_TIME_MS,
    enabled,
  });

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !cursor) return;

    setIsLoadingMore(true);
    try {
      const result = await fetchFn(cursor, limit);
      setItems((prev) => [...prev, ...result.items]);
      setCursor(result.nextCursor);
      setHasMore(!!result.nextCursor);
    } finally {
      setIsLoadingMore(false);
    }
  }, [cursor, hasMore, isLoadingMore, fetchFn, limit]);

  const reset = useCallback(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    refetch();
  }, [refetch]);

  return {
    items,
    isLoading: isInitialLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    reset,
  };
}

/**
 * Hook for memoized analytics calculations
 */
export function useMemoizedAnalytics<T, R>(
  data: T[],
  computeFn: (data: T[]) => R,
  deps: unknown[] = []
) {
  return useMemo(() => {
    if (!data || data.length === 0) return null;
    return computeFn(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, ...deps]);
}
