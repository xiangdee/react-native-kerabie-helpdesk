import React from 'react';
import {
  FlatList,
  Image,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useKerAbieStore } from '../hooks/useKerAbieStore';
import { Skeleton } from './Skeleton';
import { usePalette, withAlpha } from '../theme/palette';
import type { KerStoreProduct, KerTheme } from '../types';

interface Props {
  onClose: () => void;
  theme: KerTheme;
}

function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function StoreScreen({ onClose, theme }: Props) {
  const { products, storeName, storeUrl, loading } = useKerAbieStore();

  const palette = usePalette(theme);
  const primary = palette.primary;
  const background = palette.background;
  const textColor = palette.text;

  const renderItem = ({ item }: { item: KerStoreProduct }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.card}
      onPress={() => storeUrl && Linking.openURL(storeUrl)}
    >
      <View style={[styles.thumb, { backgroundColor: withAlpha(primary, 0.08) }]}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.thumbImage} />
        ) : (
          <Text style={{ fontSize: 24 }}>📦</Text>
        )}
      </View>
      <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>{item.name}</Text>
      <Text style={[styles.price, { color: palette.accent }]}>{formatPrice(item.price, item.currency)}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textColor }]}>{storeName ?? 'Store'}</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.close, { color: palette.accent }]}>Close</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.list}>
          {[0, 1].map((row) => (
            <View key={row} style={styles.row}>
              {[0, 1].map((col) => (
                <View key={col} style={styles.card}>
                  <Skeleton color={palette.surfaceStrong} aspectRatio={1} borderRadius={12} />
                  <Skeleton color={palette.surfaceStrong} height={12} width="70%" style={{ marginTop: 8 }} />
                  <Skeleton color={palette.surfaceStrong} height={12} width="40%" style={{ marginTop: 4 }} />
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: palette.textSubtle }]}>No products yet.</Text>
          }
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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  row: { gap: 12, paddingHorizontal: 4, marginBottom: 16 },
  card: { flex: 1 },
  thumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%' },
  name: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  price: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  empty: { textAlign: 'center', fontSize: 13, marginTop: 32, width: '100%' },
});
