import { useCallback, useEffect, useState } from 'react';
import { ApiService } from '../services/api.service';
import type { KerStoreProduct } from '../types';

/**
 * Read-only storefront for the helpdesk package — mirrors
 * useKerAbieKnowledgeBase's shape (same widget-key-scoped public endpoint
 * pattern, org resolved server-side from the configured widget key).
 */
export function useKerAbieStore() {
  const [products, setProducts] = useState<KerStoreProduct[]>([]);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [storeUrl, setStoreUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.get<{ store?: { name: string; slug?: string }; products: KerStoreProduct[] }>('/public/store/by-widget');
      setProducts(res.products ?? []);
      setStoreName(res.store?.name ?? null);
      // Public storefronts live at the org's subdomain (kerabie_web's
      // middleware rewrites {slug}.kerabie.com), not a /store/{slug} path.
      setStoreUrl(res.store?.slug ? `https://${res.store.slug}.kerabie.com` : null);
    } catch {
      // keep previous products on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  return { products, storeName, storeUrl, loading, refetch: fetchProducts };
}
