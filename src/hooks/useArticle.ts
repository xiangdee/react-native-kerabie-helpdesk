import { useEffect, useState } from 'react';
import { ApiService } from '../services/api.service';
import type { KerKbArticle } from '../types';

// One request per article for the whole session: the same article can be cited on several messages.
const cache = new Map<number, Promise<KerKbArticle | null>>();

export function loadArticle(id: number): Promise<KerKbArticle | null> {
  let pending = cache.get(id);
  if (!pending) {
    pending = ApiService.get<{ article?: KerKbArticle }>(`/public/kb/articles/${id}`)
      .then((res) => res.article ?? null)
      .catch(() => null);
    cache.set(id, pending);
    // A failed or missing article is asked for again next time instead of being remembered as missing.
    pending.then((a) => { if (!a) cache.delete(id); });
  }
  return pending;
}

/** The article behind a citation: null until it has loaded (or when it cannot be loaded). */
export function useArticle(id: number): KerKbArticle | null {
  const [article, setArticle] = useState<KerKbArticle | null>(null);
  useEffect(() => {
    let live = true;
    loadArticle(id).then((a) => { if (live) setArticle(a); });
    return () => { live = false; };
  }, [id]);
  return article;
}
