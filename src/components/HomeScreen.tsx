import React, { useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useKerAbieContext } from '../provider/KerAbieContext';
import { useKerAbieKnowledgeBase } from '../hooks/useKerAbieKnowledgeBase';
import { useKerAbieStore } from '../hooks/useKerAbieStore';
import { personalize } from '../utils/personalize';
import type { KerChatSettings, KerKbArticle, KerTheme } from '../types';
import type { KerPalette } from '../theme/palette';
import { gradientColors, GradientLayer } from './GradientLayer';
import { Icon } from './Icon';
import { Skeleton } from './Skeleton';
import { ArticleSheet } from './ArticleSheet';

interface Props {
  theme: KerTheme;
  palette: KerPalette;
  chatSettings?: KerChatSettings;
  onClose: () => void;
  onChat: () => void;
}

function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

// The widget's landing screen — same layout as the web widget's HomeScreen.vue: branded header with the
// greeting, a search box, featured products, suggested articles and the "Ask our AI / Chat with us" card.
export function HomeScreen({ theme, palette, chatSettings, onClose, onChat }: Props) {
  const ctx = useKerAbieContext();
  const { articles, loading, search } = useKerAbieKnowledgeBase();
  const { products, storeUrl } = useKerAbieStore();
  const [query, setQuery] = useState('');
  const [openArticle, setOpenArticle] = useState<KerKbArticle | null>(null);

  const font = theme.fontFamily;
  const chatbot = chatSettings?.chatbotEnabled ?? false;
  const agentsOnline = ctx.onlineAgents > 0;
  const showGreeting = chatSettings?.showGreeting !== false;
  const greeting = personalize(chatSettings?.greetingText || 'Hello there\nGot questions?', ctx.visitorName);
  const statusText = chatSettings?.statusChipText || (chatbot ? 'Instant answers' : agentsOnline ? 'We reply in minutes' : "We're offline");
  const available = agentsOnline || chatbot;
  const name = chatSettings?.name ?? ctx.appName ?? 'Support';
  const trimmed = query.trim();

  return (
    <View style={{ flex: 1, backgroundColor: palette.surface }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: palette.primary }]}>
          <GradientLayer colors={gradientColors(theme)} />
          <View style={styles.headerRow}>
            <View style={[styles.logo, { backgroundColor: palette.onPrimary }]}>
              {chatSettings?.logoUrl ? (
                <Image source={{ uri: chatSettings.logoUrl }} style={styles.logoImg} />
              ) : (
                <Text style={[styles.logoLetter, { color: palette.primary, fontFamily: font }]}>{name.charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <Text style={[styles.name, { color: palette.onPrimary, fontFamily: font }]} numberOfLines={1}>{name}</Text>
            {chatSettings?.showStatusChip !== false && (
              <View style={[styles.chip, { backgroundColor: 'rgba(255,255,255,0.2)' }]} accessibilityRole="text">
                <View style={[styles.dot, { backgroundColor: available ? '#4ade80' : '#cbd5e1' }]} />
                <Text style={[styles.chipText, { color: palette.onPrimary, fontFamily: font }]}>{statusText}</Text>
              </View>
            )}
            <TouchableOpacity onPress={onClose} style={styles.close} accessibilityLabel="Close">
              <Icon name="close" size={20} color={palette.onPrimary} />
            </TouchableOpacity>
          </View>
          {showGreeting && <Text style={[styles.greeting, { color: palette.onPrimary, fontFamily: font }]}>{greeting}</Text>}
        </View>

        <View style={styles.body}>
          <View style={[styles.card, { backgroundColor: palette.background }]}>
            <View style={[styles.searchBox, { backgroundColor: palette.inputBackground }]}>
              <Icon name="search" size={18} color={palette.textMuted} />
              <TextInput
                value={query}
                onChangeText={(v) => { setQuery(v); search(v); }}
                placeholder="Search for help"
                placeholderTextColor={palette.textSubtle}
                returnKeyType="search"
                style={[styles.searchInput, { color: palette.text, fontFamily: font }]}
              />
            </View>

            {!trimmed && products.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.sectionTitle, { color: palette.textMuted, fontFamily: font }]}>Featured products</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 8 }}>
                  {products.map((p) => (
                    <TouchableOpacity key={p.id} style={styles.product} onPress={() => storeUrl && Linking.openURL(storeUrl).catch(() => {})} activeOpacity={0.8}>
                      <View style={[styles.productImage, { backgroundColor: palette.surface }]}>
                        {p.imageUrl ? <Image source={{ uri: p.imageUrl }} style={styles.productImg} /> : <Icon name="package" size={28} color={palette.textSubtle} />}
                      </View>
                      <Text style={[styles.productName, { color: palette.text, fontFamily: font }]} numberOfLines={1}>{p.name}</Text>
                      <Text style={[styles.productPrice, { color: palette.textMuted, fontFamily: font }]}>{formatPrice(p.price, p.currency)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: palette.textMuted, fontFamily: font, marginTop: 14 }]}>
              {trimmed ? `Results for "${trimmed}"` : 'Suggested articles'}
            </Text>
            {loading ? (
              [0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.articleRow}>
                  <Skeleton width={32} height={32} borderRadius={8} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width={i % 2 ? '70%' : '90%'} height={13} />
                    <Skeleton width="40%" height={11} />
                  </View>
                </View>
              ))
            ) : articles.length > 0 ? (
              articles.map((a) => (
                <TouchableOpacity key={a.id} style={styles.articleRow} onPress={() => setOpenArticle(a)} activeOpacity={0.7}>
                  {a.imageUrl ? (
                    <Image source={{ uri: a.imageUrl }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbIcon, { backgroundColor: palette.surface }]}>
                      <Icon name="article" size={16} color={palette.accent} strokeWidth={1.9} />
                    </View>
                  )}
                  <Text style={[styles.articleTitle, { color: palette.text, fontFamily: font }]} numberOfLines={2}>{a.title}</Text>
                  <Icon name="forward" size={16} color={palette.textSubtle} />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[styles.empty, { color: palette.textSubtle, fontFamily: font }]}>
                {trimmed ? 'No articles match your search.' : 'No articles yet.'}
              </Text>
            )}
          </View>

          <TouchableOpacity style={[styles.ask, { backgroundColor: palette.background }]} onPress={onChat} activeOpacity={0.8}>
            <View style={[styles.askIcon, { backgroundColor: palette.primary }]}>
              <GradientLayer colors={gradientColors(theme)} />
              <Icon name="sparkle" size={18} color={palette.onPrimary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.askTitle, { color: palette.text, fontFamily: font }]}>{chatbot ? 'Ask our AI' : 'Chat with us'}</Text>
              <Text style={[styles.askSub, { color: palette.textMuted, fontFamily: font }]}>
                {chatbot ? 'Instant answers, 24/7. A human is one tap away.' : 'Send us a message and we will reply as soon as we can.'}
              </Text>
            </View>
            <Icon name="forward" size={18} color={palette.textSubtle} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {openArticle && (
        <ArticleSheet
          visible
          articleId={openArticle.id}
          title={openArticle.title}
          content={openArticle.content}
          imageUrl={openArticle.imageUrl ?? undefined}
          onClose={() => setOpenArticle(null)}
          theme={theme}
          palette={palette}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 56, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  logoImg: { width: 36, height: 36 },
  logoLetter: { fontSize: 16, fontWeight: '800' },
  name: { flex: 1, fontSize: 16, fontWeight: '700' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontSize: 12, fontWeight: '600' },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  greeting: { fontSize: 26, fontWeight: '800', lineHeight: 32, marginTop: 22 },
  body: { paddingHorizontal: 14, marginTop: -40, gap: 12 },
  card: { borderRadius: 18, padding: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  product: { width: 110 },
  productImage: { width: 110, height: 110, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  productImg: { width: 110, height: 110 },
  productName: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  productPrice: { fontSize: 12, marginTop: 2 },
  articleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  thumb: { width: 32, height: 32, borderRadius: 8 },
  thumbIcon: { alignItems: 'center', justifyContent: 'center' },
  articleTitle: { flex: 1, fontSize: 14, fontWeight: '500' },
  empty: { textAlign: 'center', paddingVertical: 20, fontSize: 13 },
  ask: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 14 },
  askIcon: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  askTitle: { fontSize: 15, fontWeight: '700' },
  askSub: { fontSize: 12.5, marginTop: 2, lineHeight: 17 },
});
