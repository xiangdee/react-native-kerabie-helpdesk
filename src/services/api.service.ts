const BASE = 'https://api.kerabie.com';

interface ApiConfig {
  widgetKey: string;
  sessionId: string;
}

let _config: ApiConfig | null = null;

export const ApiService = {
  init(config: ApiConfig) {
    _config = config;
  },

  async post<T = any>(path: string, body: unknown): Promise<T> {
    if (!_config) throw new Error('ApiService not initialized');
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-widget-key': _config.widgetKey,
        'x-session-id': _config.sessionId,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message ?? `HTTP ${res.status}`);
    }
    return res.json();
  },

  // multipart/form-data — used for file uploads. No Content-Type header set
  // here: RN's fetch derives the multipart boundary itself from the
  // FormData, and setting it manually breaks the boundary.
  async postForm<T = any>(path: string, form: FormData): Promise<T> {
    if (!_config) throw new Error('ApiService not initialized');
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'x-widget-key': _config.widgetKey,
        'x-session-id': _config.sessionId,
      },
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message ?? `HTTP ${res.status}`);
    }
    return res.json();
  },

  async delete<T = any>(path: string): Promise<T> {
    if (!_config) throw new Error('ApiService not initialized');
    const res = await fetch(`${BASE}${path}`, {
      method: 'DELETE',
      headers: {
        'x-widget-key': _config.widgetKey,
        'x-session-id': _config.sessionId,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async get<T = any>(path: string, params?: Record<string, string>): Promise<T> {
    if (!_config) throw new Error('ApiService not initialized');
    const url = new URL(`${BASE}${path}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      headers: {
        'x-widget-key': _config.widgetKey,
        'x-session-id': _config.sessionId,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
};
