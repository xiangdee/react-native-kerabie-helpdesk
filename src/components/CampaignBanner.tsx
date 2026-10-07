import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { BubblePosition, KerTheme } from '../types';
import type { KerCampaign } from '../utils/campaignRules';
import { GradientLayer, gradientColors } from './GradientLayer';
import { DEFAULT_PRIMARY_COLOR } from '../theme/palette';

interface Props {
  campaign: KerCampaign;
  theme: KerTheme;
  name: string;
  position: BubblePosition;
  /** Tapping the message (or "Reply") opens the chat. */
  onOpen: () => void;
  /** Tapping the campaign's button. */
  onCta: () => void;
  onDismiss: () => void;
}

/** The proactive message shown above the launcher — mirrors the web widget's CampaignBubble. */
export function CampaignBanner({ campaign, theme, name, position, onOpen, onCta, onDismiss }: Props) {
  const side = position === 'bottom-left' ? { left: 16 } : { right: 16 };
  const accent = theme.primaryColor ?? DEFAULT_PRIMARY_COLOR;

  return (
    <View style={[styles.wrap, side]} pointerEvents="box-none">
      <View style={styles.card}>
        {campaign.imageUrl ? (
          <TouchableOpacity activeOpacity={0.9} onPress={onOpen}>
            <Image source={{ uri: campaign.imageUrl }} style={styles.cover} resizeMode="cover" />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.close, campaign.imageUrl ? styles.closeOnCover : null]}
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Dismiss"
        >
          <Text style={[styles.closeText, campaign.imageUrl ? { color: '#fff', fontSize: 11 } : null]}>✕</Text>
        </TouchableOpacity>
        <View style={styles.body}>
        <TouchableOpacity activeOpacity={0.8} onPress={onOpen} style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: accent }]}>
            <Text style={styles.avatarText}>{(name || '?').trim().charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <Text style={styles.message}>{campaign.message}</Text>
          </View>
        </TouchableOpacity>
        {campaign.ctaLabel ? (
          <TouchableOpacity activeOpacity={0.85} onPress={onCta} style={styles.cta}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: accent }]} pointerEvents="none">
              <GradientLayer colors={theme.bubbleColor ? null : gradientColors(theme)} />
            </View>
            <Text style={styles.ctaText} numberOfLines={1}>{campaign.ctaLabel}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onOpen}><Text style={[styles.reply, { color: accent }]}>Reply →</Text></TouchableOpacity>
        )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 96, width: 300, maxWidth: '90%', zIndex: 9998 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  cover: { width: '100%', aspectRatio: 800 / 420 },
  body: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingRight: 14 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  close: { position: 'absolute', top: 8, right: 10, zIndex: 1 },
  closeOnCover: { top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 13, color: '#94a3b8' },
  name: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', color: '#64748b', marginBottom: 2 },
  message: { fontSize: 14, color: '#1e293b', lineHeight: 20 },
  reply: { fontSize: 13, fontWeight: '600' },
  cta: { height: 36, borderRadius: 9, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  ctaText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
