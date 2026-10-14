import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiService } from '../services/api.service';
import { StorageService } from '../services/storage.service';
import type { KerKbArticle } from '../types';

/**
 * Searchable, org-scoped knowledge base for the helpdesk package — mirrors
 * the chat widget's HomeScreen.vue (same public/kb/articles endpoint,
 * published-only, widget-key scoped, debounced search).
 */
export function useKerAbieKnowledgeBase() {
  const [articles, setArticles] = useState<KerKbArticle[]>([]);
  // True until the first answer (or remembered content) is in, so the screen never flashes "No articles yet." before
  // the skeleton — the old initial `false` rendered the empty state for a frame on every open.
  const [loading, setLoading] = useState(true);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const articlesRef = useRef<KerKbArticle[]>([]);
  articlesRef.current = articles;
  // Set once the server has answered, so remembered content that is still being read never overwrites it.
  const gotFresh = useRef(false);
  const cacheKey = `cache:kb:${ApiService.widgetKey()}`;

  const fetchArticles = useCallback(async (search?: string) => {
    // A search replaces the list so it shows the skeleton; refreshing the default list behind remembered articles does not.
    if (search || articlesRef.current.length === 0) setLoading(true);
    try {
      const res = await ApiService.get<{ data: KerKbArticle[] }>('/public/kb/articles', search ? { search } : undefined);
      setArticles(res.data ?? []);
      if (!search) {
        gotFresh.current = true;
        StorageService.set(cacheKey, res.data ?? []).catch(() => {}); // remembered for the next open
      }
    } catch {
      // keep previous articles on error
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);

  const search = useCallback((query: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchArticles(query), 400);
  }, [fetchArticles]);

  const getArticle = useCallback(async (id: number): Promise<KerKbArticle | null> => {
    try {
      const res = await ApiService.get<{ article: KerKbArticle }>(`/public/kb/articles/${id}`);
      return res.article ?? null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    // Remembered articles paint immediately; the request below then refreshes them.
    StorageService.get<KerKbArticle[]>(cacheKey)
      .then((remembered) => {
        if (remembered && !gotFresh.current) {
          setArticles(remembered);
          setLoading(false);
        }
      })
      .catch(() => {});
    fetchArticles();
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [fetchArticles, cacheKey]);

  return { articles, loading, search, getArticle, refetch: fetchArticles };
}
