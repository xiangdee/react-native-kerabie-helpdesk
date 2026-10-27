import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useKerAbieKnowledgeBase } from '../hooks/useKerAbieKnowledgeBase';
import type { KerKbArticle, KerTheme } from '../types';
import type { KerPalette } from '../theme/palette';
import { SettingsScreen } from './SettingsScreen';
import { ArticleSheet } from './ArticleSheet';
import { Skeleton } from './Skeleton';
import { Icon } from './Icon';

// Only the top few articles fit this screen's "quick answers" role; the full searchable list is Home's job.
const MAX_FAQS = 8;

interface Props {
  theme: KerTheme;
  palette: KerPalette;
}

// The Help tab — same as the web widget's HelpScreen.vue: the options card (name, transcripts, data) and
// the org's most useful Knowledge Base articles as FAQs (same articles, same cache as Home).
export function HelpScreen({ theme, palette }: Props) {
  const { articles, loading } = useKerAbieKnowledgeBase();
  const [openFaq, setOpenFaq] = useState<KerKbArticle | null>(null);
  const faqs = articles.slice(0, MAX_FAQS);
  const font = theme.fontFamily;

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.header, { backgroundColor: palette.background, borderBottomColor: palette.border }]}>
        <Text style={[styles.title, { color: palette.text, fontFamily: font }]}>Help &amp; Settings</Text>
      </View>
      <SettingsScreen theme={theme} palette={palette}>
        {(loading || faqs.length > 0) && (
          <View style={{ marginTop: 20 }}>
            <Text style={[styles.sectionLabel, { color: palette.textMuted, fontFamily: font }]}>Frequently asked questions</Text>
            <View style={[styles.card, { backgroundColor: palette.background }]}>
              {loading && faqs.length === 0
                ? [0, 1, 2].map((i) => (
                    <View key={i} style={[styles.faq, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border }]}>
                      <Skeleton width={i % 2 ? '60%' : '80%'} height={14} />
                    </View>
                  ))
                : faqs.map((a, i) => (
                    <TouchableOpacity
                      key={a.id}
                      style={[styles.faq, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border }]}
                      onPress={() => setOpenFaq(a)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.faqText, { color: palette.text, fontFamily: font }]} numberOfLines={2}>{a.title}</Text>
                      <Icon name="forward" size={16} color={palette.textSubtle} />
                    </TouchableOpacity>
                  ))}
            </View>
          </View>
        )}
      </SettingsScreen>

      {openFaq && (
        <ArticleSheet
          visible
          articleId={openFaq.id}
          title={openFaq.title}
          content={openFaq.content}
          imageUrl={openFaq.imageUrl ?? undefined}
          onClose={() => setOpenFaq(null)}
          theme={theme}
          palette={palette}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 16, fontWeight: '700' },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginHorizontal: 4, marginBottom: 10 },
  card: { borderRadius: 16, overflow: 'hidden' },
  faq: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 14 },
  faqText: { flex: 1, fontSize: 14, fontWeight: '500' },
});
