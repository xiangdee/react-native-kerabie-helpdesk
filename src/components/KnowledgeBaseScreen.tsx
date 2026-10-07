import React, { useState } from 'react';
import {
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useKerAbieKnowledgeBase } from '../hooks/useKerAbieKnowledgeBase';
import { Skeleton } from './Skeleton';
import { usePalette, withAlpha } from '../theme/palette';
import type { KerKbArticle, KerTheme } from '../types';
import { ArticleSheet } from './ArticleSheet';

interface Props {
  onClose: () => void;
  theme: KerTheme;
}

export function KnowledgeBaseScreen({ onClose, theme }: Props) {
  const { articles, loading, search } = useKerAbieKnowledgeBase();
  const [query, setQuery] = useState('');
  const [openArticle, setOpenArticle] = useState<KerKbArticle | null>(null);

  const palette = usePalette(theme);
  const primary = palette.primary;
  const background = palette.background;
  const textColor = palette.text;

  const handleChangeQuery = (v: string) => {
    setQuery(v);
    search(v);
  };

  const renderItem = ({ item }: { item: KerKbArticle }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setOpenArticle(item)}
        style={styles.row}
      >
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumbPlaceholder, { backgroundColor: withAlpha(primary, 0.12) }]}>
            <Text style={{ fontSize: 18 }}>📄</Text>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textColor }]}>Help</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.close, { color: palette.accent }]}>Close</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={handleChangeQuery}
          placeholder="Search for help"
          placeholderTextColor={palette.textSubtle}
          style={[styles.searchInput, { color: textColor, borderColor: palette.borderStrong, backgroundColor: palette.inputBackground }]}
        />
      </View>

      {loading ? (
        <View style={styles.list}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.row}>
              <Skeleton color={palette.surfaceStrong} width={40} height={40} borderRadius={8} />
              <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                <Skeleton color={palette.surfaceStrong} height={13} width={i % 2 === 0 ? '70%' : '90%'} />
                <Skeleton color={palette.surfaceStrong} height={11} width="40%" />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: palette.textSubtle }]}>
              {query ? 'No articles match your search.' : 'No articles yet.'}
            </Text>
          }
        />
      )}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  close: { fontSize: 14, fontWeight: '600' },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  searchInput: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
  },
  thumb: { width: 40, height: 40, borderRadius: 8 },
  thumbPlaceholder: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '600' },
  empty: { textAlign: 'center', fontSize: 13, marginTop: 32 },
});
