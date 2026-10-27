import React, { useState } from 'react';
import { Image, Linking, StyleSheet, Text, TextStyle, View } from 'react-native';
import { HtmlElement, HtmlNode, parseHtml, textOf } from '../utils/html';
import type { KerPalette } from '../theme/palette';

interface Props {
  html: string;
  palette: KerPalette;
  fontFamily?: string;
  fontSize?: number;
}

const BLOCKS = new Set([
  'p', 'div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'nav', 'figure', 'figcaption', 'address', 'details', 'summary',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'hr', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'img',
]);

const HEADING_SCALE: Record<string, number> = { h1: 1.45, h2: 1.3, h3: 1.17, h4: 1.07, h5: 1, h6: 1 };
const ALIGN: Record<string, TextStyle['textAlign']> = { 'ql-align-center': 'center', 'ql-align-right': 'right', 'ql-align-justify': 'justify' };
// Quill's size classes, relative to the body text.
const SIZE: Record<string, number> = { 'ql-size-small': 0.8, 'ql-size-large': 1.3, 'ql-size-huge': 1.7 };
const SAFE_COLOR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%/]+\)|hsla?\([\d\s.,%/deg]+\)|[a-z]{3,20})$/i;
const SAFE_LINK = /^(https?:|mailto:|tel:)/i;
// Any run of whitespace, including the non-breaking space (U+00A0), is one ordinary space.
const WHITESPACE = new RegExp('[\\s\\u00A0]+', 'g');

const classesOf = (el: HtmlElement) => (el.attrs.class ?? '').split(/\s+/).filter(Boolean);
const indentOf = (el: HtmlElement) => Number(classesOf(el).find((c) => /^ql-indent-\d+$/.test(c))?.slice(10) ?? 0);
const alignOf = (el: HtmlElement) => classesOf(el).map((c) => ALIGN[c]).find(Boolean);
const isBlock = (n: HtmlNode) => n.type === 'element' && BLOCKS.has(n.tag);
const isBlank = (n: HtmlNode) => n.type === 'text' && n.text.trim() === '';

function cssValue(el: HtmlElement, prop: 'color' | 'background-color'): string | undefined {
  const m = (el.attrs.style ?? '').match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'i'));
  const value = m?.[1]?.trim();
  return value && SAFE_COLOR.test(value) ? value : undefined;
}

interface Ctx {
  palette: KerPalette;
  fontFamily?: string;
  size: number;
}

/** Inline content: nested Text with bold, italic, links and so on. */
function renderInline(nodes: HtmlNode[], ctx: Ctx, keyPrefix: string): React.ReactNode[] {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}.${i}`;
    // Non-breaking spaces become ordinary ones: some articles have one between every word, which would stop the text wrapping.
    if (node.type === 'text') return <Text key={key}>{node.text.replace(WHITESPACE, ' ')}</Text>;
    const children = renderInline(node.children, ctx, key);
    switch (node.tag) {
      case 'br':
        return <Text key={key}>{'\n'}</Text>;
      case 'strong':
      case 'b':
        return <Text key={key} style={styles.bold}>{children}</Text>;
      case 'em':
      case 'i':
        return <Text key={key} style={styles.italic}>{children}</Text>;
      case 'u':
        return <Text key={key} style={styles.underline}>{children}</Text>;
      case 's':
      case 'strike':
      case 'del':
        return <Text key={key} style={styles.strike}>{children}</Text>;
      case 'sub':
      case 'sup':
        return <Text key={key}>{children}</Text>;
      case 'code':
      case 'kbd':
      case 'samp':
        return <Text key={key} style={[styles.code, { backgroundColor: ctx.palette.surface, color: ctx.palette.text }]}>{children}</Text>;
      case 'a': {
        const href = node.attrs.href?.trim();
        if (!href || !SAFE_LINK.test(href)) return <Text key={key}>{children}</Text>;
        return (
          <Text key={key} style={{ color: ctx.palette.accent, textDecorationLine: 'underline' }} onPress={() => Linking.openURL(href).catch(() => {})}>
            {children}
          </Text>
        );
      }
      default: {
        // span, font and anything unknown: keep the text, honour a simple colour or Quill size.
        const color = cssValue(node, 'color');
        const background = cssValue(node, 'background-color');
        const scale = classesOf(node).map((c) => SIZE[c]).find(Boolean);
        const style: TextStyle = {};
        if (color) style.color = color;
        if (background) style.backgroundColor = background;
        if (scale) style.fontSize = ctx.size * scale;
        return Object.keys(style).length ? <Text key={key} style={style}>{children}</Text> : <Text key={key}>{children}</Text>;
      }
    }
  });
}

/** A run of inline nodes as one paragraph-like Text. Nothing is drawn for whitespace alone. */
function paragraph(nodes: HtmlNode[], ctx: Ctx, key: string, extra?: TextStyle) {
  const trimmed = trimEdges(nodes);
  if (trimmed.length === 0) return null;
  return (
    <Text key={key} style={[{ color: ctx.palette.text, fontFamily: ctx.fontFamily, fontSize: ctx.size, lineHeight: ctx.size * 1.55 }, extra]}>
      {renderInline(trimmed, ctx, key)}
    </Text>
  );
}

function trimEdges(nodes: HtmlNode[]): HtmlNode[] {
  let start = 0;
  let end = nodes.length;
  while (start < end && isBlank(nodes[start])) start++;
  while (end > start && isBlank(nodes[end - 1])) end--;
  const out = nodes.slice(start, end);
  const first = out[0];
  const last = out[out.length - 1];
  if (first?.type === 'text') out[0] = { type: 'text', text: first.text.replace(/^\s+/, '') };
  if (last?.type === 'text') out[out.length - 1] = { type: 'text', text: last.text.replace(/\s+$/, '') };
  return out;
}

function ImageBlock({ uri, palette }: { uri: string; palette: KerPalette }) {
  const [ratio, setRatio] = useState(16 / 9);
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <Image
      source={{ uri }}
      style={{ width: '100%', aspectRatio: ratio, borderRadius: 8, backgroundColor: palette.surface }}
      resizeMode="contain"
      onLoad={(e) => {
        const { width, height } = e.nativeEvent.source;
        if (width && height) setRatio(width / height);
      }}
      onError={() => setFailed(true)}
    />
  );
}

/** Children of a block element: consecutive inline nodes group into paragraphs, block children render on their own. */
function renderChildren(nodes: HtmlNode[], ctx: Ctx, keyPrefix: string, textStyle?: TextStyle): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let run: HtmlNode[] = [];
  const flush = (i: number) => {
    const p = paragraph(run, ctx, `${keyPrefix}.p${i}`, textStyle);
    if (p) out.push(p);
    run = [];
  };
  nodes.forEach((node, i) => {
    if (isBlock(node)) {
      flush(i);
      const rendered = renderBlock(node as HtmlElement, ctx, `${keyPrefix}.${i}`, textStyle);
      if (rendered) out.push(rendered);
    } else {
      run.push(node);
    }
  });
  flush(nodes.length);
  return out;
}

/** Number of the `index`th item in an ordered list, counting only items of that list kind. */
function renderList(el: HtmlElement, ctx: Ctx, key: string, textStyle?: TextStyle) {
  const items = el.children.filter((c): c is HtmlElement => c.type === 'element' && c.tag === 'li');
  let ordered = 0;
  return (
    <View key={key} style={{ gap: 6 }}>
      {items.map((li, i) => {
        // Quill 2 writes every list item into an <ol> and says what it is in data-list.
        const kind = li.attrs['data-list'] ?? (el.tag === 'ol' ? 'ordered' : 'bullet');
        if (kind === 'ordered') ordered++; else ordered = 0;
        const marker = kind === 'ordered' ? `${ordered}.` : kind === 'checked' ? '☑' : kind === 'unchecked' ? '☐' : '•';
        const content = li.children.filter((c) => !(c.type === 'element' && classesOf(c).includes('ql-ui')));
        return (
          <View key={`${key}.${i}`} style={[styles.listItem, { paddingLeft: indentOf(li) * 18 }]}>
            <Text style={[styles.marker, { color: ctx.palette.text, fontFamily: ctx.fontFamily, fontSize: ctx.size, lineHeight: ctx.size * 1.55 }]}>{marker}</Text>
            <View style={{ flex: 1, gap: 4 }}>{renderChildren(content, ctx, `${key}.${i}`, textStyle)}</View>
          </View>
        );
      })}
    </View>
  );
}

function renderBlock(el: HtmlElement, ctx: Ctx, key: string, inherited?: TextStyle): React.ReactNode {
  const align = alignOf(el);
  const textStyle: TextStyle | undefined = align ? { ...inherited, textAlign: align } : inherited;
  switch (el.tag) {
    case 'hr':
      return <View key={key} style={[styles.rule, { backgroundColor: ctx.palette.border }]} />;
    case 'img': {
      const src = el.attrs.src?.trim();
      return src && /^https?:/i.test(src) ? <ImageBlock key={key} uri={src} palette={ctx.palette} /> : null;
    }
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
      const size = ctx.size * HEADING_SCALE[el.tag];
      return paragraph(el.children, ctx, key, { ...textStyle, fontSize: size, lineHeight: size * 1.35, fontWeight: '700', marginTop: 6 });
    }
    case 'ul':
    case 'ol':
      return renderList(el, ctx, key, textStyle);
    case 'li':
      // A stray <li> outside a list.
      return <View key={key}>{renderChildren(el.children, ctx, key, textStyle)}</View>;
    case 'blockquote':
      return (
        <View key={key} style={[styles.quote, { borderLeftColor: ctx.palette.borderStrong }]}>
          {renderChildren(el.children, ctx, key, { ...textStyle, color: ctx.palette.textMuted })}
        </View>
      );
    case 'pre':
      return (
        <View key={key} style={[styles.pre, { backgroundColor: ctx.palette.surface }]}>
          <Text style={[styles.preText, { color: ctx.palette.text }]}>{textOf(el.children).replace(/^\n+|\n+$/g, '')}</Text>
        </View>
      );
    case 'table':
    case 'thead':
    case 'tbody':
    case 'tfoot':
      return <View key={key} style={{ gap: 4 }}>{renderChildren(el.children, ctx, key, textStyle)}</View>;
    case 'tr':
      return (
        <View key={key} style={styles.row}>
          {el.children.filter((c): c is HtmlElement => c.type === 'element').map((cell, i) => (
            <View key={`${key}.${i}`} style={styles.cell}>{renderChildren(cell.children, ctx, `${key}.${i}`, cell.tag === 'th' ? { ...textStyle, fontWeight: '700' } : textStyle)}</View>
          ))}
        </View>
      );
    case 'td':
    case 'th':
      return <View key={key} style={styles.cell}>{renderChildren(el.children, ctx, key, textStyle)}</View>;
    default: {
      // Quill 2 groups code lines in <div class="ql-code-block-container"> of <div class="ql-code-block">.
      if (classesOf(el).includes('ql-code-block-container')) {
        const lines = el.children.map((c) => (c.type === 'text' ? c.text : textOf(c.children))).join('\n');
        return (
          <View key={key} style={[styles.pre, { backgroundColor: ctx.palette.surface }]}>
            <Text style={[styles.preText, { color: ctx.palette.text }]}>{lines.trim()}</Text>
          </View>
        );
      }
      const indent = indentOf(el);
      const body = renderChildren(el.children, ctx, key, textStyle);
      return <View key={key} style={[{ gap: 4 }, indent ? { paddingLeft: indent * 18 } : null]}>{body}</View>;
    }
  }
}

/**
 * A knowledge base article body (Quill HTML, AI-written or crawled text) as native views, without any renderer
 * dependency: headings, bold, italic, underline, strikethrough, links, lists (including Quill 2's), quotes, code, images,
 * tables and Quill's alignment, indent and size classes. Entities such as `&nbsp;` are decoded. Scripts, styles and
 * unknown attributes are never used.
 */
export function HtmlContent({ html, palette, fontFamily, fontSize = 14 }: Props) {
  const ctx: Ctx = { palette, fontFamily, size: fontSize };
  const nodes = React.useMemo(() => parseHtml(html), [html]);
  return <View style={{ gap: 10 }}>{renderChildren(nodes, ctx, 'h')}</View>;
}

const styles = StyleSheet.create({
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  underline: { textDecorationLine: 'underline' },
  strike: { textDecorationLine: 'line-through' },
  code: { fontFamily: 'Courier', fontSize: 13 },
  listItem: { flexDirection: 'row', gap: 8 },
  marker: { minWidth: 18 },
  rule: { height: StyleSheet.hairlineWidth * 2, marginVertical: 4 },
  quote: { borderLeftWidth: 3, paddingLeft: 12, gap: 4 },
  pre: { borderRadius: 8, padding: 10 },
  preText: { fontFamily: 'Courier', fontSize: 12.5, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1, gap: 4 },
});
