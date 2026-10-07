import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { ApiService } from '../services/api.service';
import { KerPalette, withAlpha } from '../theme/palette';
import type { KerTheme } from '../types';
import { ArticleFeedback } from './ArticleFeedback';

interface Props {
  visible: boolean;
  articleId: number;
  title: string;
  /** Article body. When omitted (chat citations only know the id) the sheet fetches it. */
  content?: string;
  imageUrl?: string;
  onClose: () => void;
  theme: KerTheme;
  palette: KerPalette;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// react-native-render-html is an optional peer dependency (apps that never
// open an article shouldn't be forced to install it). Resolved once, lazily,
// with a plain-text fallback for apps that haven't added it.
let renderHtmlModule: typeof import('react-native-render-html') | null | undefined;
function loadRenderHtml(): Promise<typeof import('react-native-render-html') | null> {
  if (renderHtmlModule !== undefined) return Promise.resolve(renderHtmlModule);
  return import('react-native-render-html')
    .then((mod) => { renderHtmlModule = mod; return mod; })
    .catch(() => { renderHtmlModule = null; return null; });
}

function ArticleContent({ html, textColor, width }: { html: string; textColor: string; width: number }) {
  const [mod, setMod] = useState(renderHtmlModule);

  useEffect(() => {
    if (mod === undefined) loadRenderHtml().then(setMod);
  }, [mod]);

  if (mod) {
    const RenderHTML = mod.default;
    return (
      <RenderHTML
        contentWidth={width}
        source={{ html }}
        baseStyle={{ color: textColor, fontSize: 14, lineHeight: 22 }}
        enableExperimentalMarginCollapsing
      />
    );
  }
  return <Text style={{ color: textColor, fontSize: 14, lineHeight: 22 }}>{stripHtml(html)}</Text>;
}

// Bottom-sheet article reader on React Native's own <Modal> (no extra
// dependency). Mirrors kerabie-chat-widget's ArticleSheet.vue.
export function ArticleSheet({ visible, articleId, title, content, imageUrl, onClose, theme, palette }: Props) {
  const { width, height } = useWindowDimensions();
  const [html, setHtml] = useState(content ?? '');
  const [loading, setLoading] = useState(content === undefined);
  const [cover, setCover] = useState(imageUrl);

  useEffect(() => {
    if (!visible) return;
    if (content !== undefined) { setHtml(content); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    ApiService.get<{ article?: { content?: string; imageUrl?: string | null } }>(`/public/kb/articles/${articleId}`)
      .then((res) => { if (cancelled) return; setHtml(res.article?.content ?? ''); setCover(res.article?.imageUrl ?? undefined); })
      .catch(() => { if (!cancelled) setHtml(''); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible, articleId, content]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: palette.background, maxHeight: height * 0.85 }]}>
          <View style={[styles.handle, { backgroundColor: palette.borderStrong }]} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: palette.text, fontFamily: theme.fontFamily }]}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Close"
              style={[styles.closeBtn, { backgroundColor: withAlpha(palette.text, 0.08) }]}
            >
              <Text style={{ color: palette.textMuted, fontSize: 14 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.body}>
            {!!cover && <Image source={{ uri: cover }} style={styles.cover} />}
            {loading ? (
              <ActivityIndicator color={palette.accent} style={{ marginVertical: 16 }} />
            ) : html ? (
              <>
                <ArticleContent html={html} textColor={palette.text} width={width - 32} />
                <ArticleFeedback articleId={articleId} textColor={palette.text} borderColor={palette.border} />
              </>
            ) : (
              <Text style={{ color: palette.textMuted, fontSize: 13 }}>Could not load this article.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 12 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 4, marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', lineHeight: 23 },
  closeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 16, paddingBottom: 16 },
  cover: { width: '100%', height: 150, borderRadius: 10, marginBottom: 12 },
});
