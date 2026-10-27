import React from 'react';
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import type { KerStoreProduct, KerTheme } from '../types';
import { withAlpha, type KerPalette } from '../theme/palette';
import { formatPrice } from '../utils/formatPrice';
import { gradientColors, GradientLayer } from './GradientLayer';
import { Icon } from './Icon';

interface Props {
  product: KerStoreProduct;
  /** The org's storefront; without one the "View in store" button is hidden. */
  storeUrl: string | null;
  onClose: () => void;
  theme: KerTheme;
  palette: KerPalette;
}

// A product opened from Home's "Featured products" — same sheet as the web widget's ProductSheet.vue:
// picture, price, description and a button to the storefront.
export function ProductSheet({ product, storeUrl, onClose, theme, palette }: Props) {
  const { height } = useWindowDimensions();
  const font = theme.fontFamily;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: palette.background, maxHeight: height * 0.85 }]}>
          <View style={[styles.handle, { backgroundColor: palette.borderStrong }]} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: palette.text, fontFamily: font }]}>{product.name}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Close" style={[styles.closeBtn, { backgroundColor: withAlpha(palette.text, 0.08) }]}>
              <Icon name="close" size={16} color={palette.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.body}>
            <View style={[styles.image, { backgroundColor: palette.surface }]}>
              {product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={styles.imageFill} resizeMode="cover" /> : <Icon name="package" size={48} color={palette.textSubtle} />}
            </View>
            <Text style={[styles.price, { color: palette.text, fontFamily: font }]}>{formatPrice(product.price, product.currency)}</Text>
            {!!product.description && <Text style={[styles.desc, { color: palette.textMuted, fontFamily: font }]}>{product.description}</Text>}
          </ScrollView>
          {!!storeUrl && (
            <View style={styles.footer}>
              <TouchableOpacity
                onPress={() => Linking.openURL(storeUrl).catch(() => {})}
                style={[styles.cta, { backgroundColor: palette.primary }]}
                activeOpacity={0.85}
              >
                <GradientLayer colors={gradientColors(theme)} />
                <Text style={[styles.ctaText, { color: palette.onPrimary, fontFamily: font }]}>View in store</Text>
              </TouchableOpacity>
            </View>
          )}
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
  body: { paddingHorizontal: 16, paddingBottom: 12 },
  image: { width: '100%', aspectRatio: 4 / 3, maxHeight: 220, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  imageFill: { width: '100%', height: '100%' },
  price: { fontSize: 18, fontWeight: '700', marginTop: 12, marginBottom: 4 },
  desc: { fontSize: 13.5, lineHeight: 21 },
  footer: { paddingHorizontal: 16, paddingTop: 4 },
  cta: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', overflow: 'hidden' },
  ctaText: { fontSize: 14, fontWeight: '600' },
});
