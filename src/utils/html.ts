// A small, forgiving HTML parser for knowledge base articles (Quill output, AI-written or crawled text): tags into a
// tree, entities decoded. It is not a browser: scripts, styles and comments are dropped, unknown tags keep their text.

export type HtmlNode = HtmlElement | HtmlText;
export interface HtmlText { type: 'text'; text: string }
export interface HtmlElement { type: 'element'; tag: string; attrs: Record<string, string>; children: HtmlNode[] }

const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'source', 'wbr']);
const DROP = new Set(['script', 'style', 'head', 'title', 'noscript', 'iframe', 'object', 'embed']);

const NAMED: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", hellip: '…', mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’',
  ldquo: '“', rdquo: '”', bull: '•', middot: '·', copy: '©', reg: '®', trade: '™', deg: '°', times: '×', laquo: '«', raquo: '»',
  euro: '€', pound: '£', yen: '¥', cent: '¢', rarr: '→', larr: '←', check: '✓',
};

const ENTITY = /&(?:#(\d+)|#x([0-9a-f]+)|([a-z][a-z0-9]*));/gi;

function decodeOnce(text: string): string {
  return text.replace(ENTITY, (whole, dec, hex, name) => {
    if (dec || hex) {
      const code = dec ? parseInt(dec, 10) : parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return NAMED[String(name).toLowerCase()] ?? whole;
  });
}

/** Entities to characters. Run twice because crawled and pasted content is often encoded twice (`&amp;nbsp;`). */
export function decodeEntities(text: string): string {
  const once = decodeOnce(text);
  return /&(?:#\d+|#x[0-9a-f]+|nbsp|amp|lt|gt|quot|apos);/i.test(once) ? decodeOnce(once) : once;
}

const TOKEN = /<!--[\s\S]*?-->|<\/([a-zA-Z][a-zA-Z0-9-]*)\s*>|<([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>|[^<]+|</g;
const ATTR = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of source.matchAll(ATTR)) attrs[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  return attrs;
}

export function parseHtml(html: string): HtmlNode[] {
  const root: HtmlElement = { type: 'element', tag: '#root', attrs: {}, children: [] };
  const stack: HtmlElement[] = [root];
  let dropping = 0;

  for (const m of html.matchAll(TOKEN)) {
    const [whole, closeTag, openTag, attrSource] = m;
    if (whole.startsWith('<!--')) continue;

    if (closeTag) {
      const tag = closeTag.toLowerCase();
      if (DROP.has(tag)) { dropping = Math.max(0, dropping - 1); continue; }
      if (dropping) continue;
      // Pop to the nearest open element of that name; a stray closing tag with no match is ignored.
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) { stack.length = i; break; }
      }
      continue;
    }

    if (openTag) {
      const tag = openTag.toLowerCase();
      if (DROP.has(tag)) { if (!whole.endsWith('/>')) dropping++; continue; }
      if (dropping) continue;
      const element: HtmlElement = { type: 'element', tag, attrs: parseAttrs(attrSource ?? ''), children: [] };
      stack[stack.length - 1].children.push(element);
      if (!VOID.has(tag) && !whole.endsWith('/>')) stack.push(element);
      continue;
    }

    if (dropping) continue;
    const text = decodeEntities(whole);
    if (text) stack[stack.length - 1].children.push({ type: 'text', text });
  }
  return root.children;
}

/** Plain text of a subtree, for places that cannot show formatting. */
export function textOf(nodes: HtmlNode[]): string {
  return nodes.map((n) => (n.type === 'text' ? n.text : textOf(n.children))).join('');
}
