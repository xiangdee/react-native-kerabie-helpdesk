import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiService } from '../services/api.service';
import type { KerKbArticle } from '../types';

/**
 * Searchable, org-scoped knowledge base for the helpdesk package — mirrors
 * the chat widget's HomeScreen.vue (same public/kb/articles endpoint,
 * published-only, widget-key scoped, debounced search).
 */
export function useKerAbieKnowledgeBase() {
  const [articles, setArticles] = useState<KerKbArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchArticles = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const res = await ApiService.get<{ data: KerKbArticle[] }>('/public/kb/articles', search ? { search } : undefined);
      setArticles(res.data ?? []);
    } catch {
      // keep previous articles on error
    } finally {
      setLoading(false);
    }
  }, []);

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
    fetchArticles();
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [fetchArticles]);

  return { articles, loading, search, getArticle, refetch: fetchArticles };
}
