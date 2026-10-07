import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { KerMessage, KerTheme } from '../types';
import { GradientLayer, bubbleRadius, gradientColors } from './GradientLayer';
import { contrastText, usePalette } from '../theme/palette';
import { ArticleSheet } from './ArticleSheet';

interface Props {
  message: KerMessage;
  theme: KerTheme;
  onRetry?: () => void;
  onPressImage?: (uri: string) => void;
}

// Splits message text into plain/link segments so a bare URL renders as a
// real, tappable, underlined link instead of dead text — previously only
// the async link-preview card (message.linkPreview) was clickable; the URL
// text itself never was.
const URL_REGEX = /(https?:\/\/[^\s]+)/g;
function linkifySegments(text: string): Array<{ text: string; isLink: boolean }> {
  if (!text) return [];
  const parts: Array<{ text: string; isLink: boolean }> = [];
  let lastIndex = 0;
  for (const match of text.matchAll(URL_REGEX)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) parts.push({ text: text.slice(lastIndex, idx), isLink: false });
    parts.push({ text: match[0], isLink: true });
    lastIndex = idx + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex), isLink: false });
  return parts;
}

function SendingDots({ color }: { color: string }) {
  const dot0 = useRef(new Animated.Value(0.3)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const makePulse = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: 250, useNativeDriver: true }),
          Animated.delay(Math.max(0, 480 - delay)),
        ]),
      );
    const animations = [makePulse(dot0, 0), makePulse(dot1, 160), makePulse(dot2, 320)];
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [dot0, dot1, dot2]);

  return (
    <View style={{ flexDirection: 'row', gap: 3, paddingTop: 4 }}>
      {[dot0, dot1, dot2].map((a, i) => (
        <Animated.View
          key={i}
          style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color, opacity: a }}
        />
      ))}
    </View>
  );
}

// Trailing blinking cursor while an AI reply is still streaming in —
// same idea as the web widget's ▍ cursor (ChatScreen.vue), just as a
// react-native Animated opacity pulse since there's no CSS here.
function BlinkingCursor({ color }: { color: string }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.Text style={{ opacity, color }}> ▍</Animated.Text>
  );
}

// KB article citation chip: the article an AI reply matched
// (chatbot.service.ts buildContext). Opens the article in a bottom sheet,
// which fetches the body itself.
function CitationChip({ id, title, palette, textColor, theme }: { id: number; title: string; palette: ReturnType<typeof usePalette>; textColor: string; theme: KerTheme }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={{ marginTop: 8 }}>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[styles.citationChip, { borderColor: palette.border, backgroundColor: palette.background }]}
      >
        <Text style={[styles.citationChipText, { color: textColor }]} numberOfLines={1}>📄 {title}</Text>
        <Text style={{ color: palette.textMuted, fontSize: 13 }}>›</Text>
      </TouchableOpacity>
      {open && <ArticleSheet visible articleId={id} title={title} onClose={() => setOpen(false)} theme={theme} palette={palette} />}
    </View>
  );
}

function agentInitials(name?: string): string {
  const parts = (name ?? 'A').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Avoids relying on the global URL class, which isn't guaranteed across
// every Hermes/RN version this SDK's peer range supports.
function hostnameOf(url: string): string {
  const match = url.match(/^[a-z]+:\/\/([^/]+)/i);
  return match ? match[1] : url;
}

export function MessageBubble({ message, theme, onRetry, onPressImage }: Props) {
  const isVisitor = message.senderType === 'visitor';
  const isBot = message.senderType === 'bot';
  const isPending = message.status === 'pending';
  const isFailed = message.status === 'failed';
  // Falls back to initials if the avatar URL fails to load (broken/expired
  // URL, network error) — Image has no built-in fallback like a browser <img>.
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  const palette = usePalette(theme);
  const bubbleBg = isFailed
    ? 'rgba(239,68,68,0.1)'
    : isVisitor
    ? (theme.userBubbleColor ?? palette.primary)
    : palette.agentBubble;
  // Text on the visitor's own bubble follows that bubble color's luminance
  // (a light brand color gets dark text instead of unreadable white).
  const onBubble = isVisitor ? contrastText(bubbleBg) : palette.text;
  // An explicit userBubbleColor prop is a developer override — it wins over the org's gradient.
  const bubbleGradient = isVisitor && !isFailed && !theme.userBubbleColor ? gradientColors(theme) : null;
  const radius = bubbleRadius(theme);
  // Keeps the chat-tail corner (the one nearest the sender) tight, as before.
  const tail = Math.min(4, radius);

  const textColor = isFailed ? '#dc2626' : onBubble;

  return (
    <View style={[styles.row, isVisitor && styles.rowRight, isPending && styles.rowPending]}>
      {!isVisitor && (
        isBot ? (
          theme.chatbotAvatarUrl ? (
            <Image source={{ uri: theme.chatbotAvatarUrl }} style={[styles.avatarImg, { backgroundColor: palette.surface }]} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: '#6366f1' }]}>
              <Text style={styles.avatarText}>🤖</Text>
            </View>
          )
        ) : message.senderAvatar && !avatarLoadFailed ? (
          <Image
            source={{ uri: message.senderAvatar }}
            style={[styles.avatarImg, { backgroundColor: palette.surface }]}
            onError={() => setAvatarLoadFailed(true)}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: palette.primary }]}>
            <Text style={[styles.avatarText, { color: palette.onPrimary }]}>{agentInitials(message.senderName)}</Text>
          </View>
        )
      )}
      <TouchableOpacity
        activeOpacity={isFailed && onRetry ? 0.7 : 1}
        onPress={isFailed && onRetry ? onRetry : undefined}
        style={[
          styles.bubble,
          {
            backgroundColor: bubbleBg,
            borderRadius: radius,
            borderBottomLeftRadius: isVisitor ? radius : tail,
            borderBottomRightRadius: isVisitor ? tail : radius,
          },
          isFailed && styles.bubbleFailed,
        ]}
      >
        <GradientLayer colors={bubbleGradient} />
        {!isVisitor && message.senderName && (
          <Text style={[styles.senderName, { color: palette.accent }]}>
            {message.senderName}
          </Text>
        )}

        {/* Attachment — matches the real wire format (type + metadata.url),
            not the KerAttachment[] array, which only ever holds this
            client's own pre-send scaffolding (see KerMessage.attachments). */}
        {(message.type === 'image' || message.type === 'file') && message.metadata?.url && (
          <View style={{ marginBottom: message.body ? 6 : 0 }}>
            {message.type === 'image' ? (
              <TouchableOpacity
                onPress={() => onPressImage?.(message.metadata!.url!)}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: message.metadata.url }}
                  style={styles.attachmentImg}
                  resizeMode="cover"
                  resizeMethod={Platform.OS === 'android' ? 'resize' : undefined}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => Linking.openURL(message.metadata!.url!)}
                style={styles.attachmentFile}
              >
                <Text style={[styles.attachmentFileName, { color: isVisitor ? onBubble : palette.text }]}>
                  📎 {message.metadata.fileName ?? 'File'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* A caption typed alongside an image/file (WhatsApp-style) is just
            message.body — rendered below the attachment above, same as the
            chat widget. */}
        {(!!message.body || message.streaming) && (
          <Text style={[styles.body, { color: textColor, fontFamily: theme.fontFamily }]}>
            {linkifySegments(message.body).map((seg, i) =>
              seg.isLink ? (
                <Text
                  key={i}
                  style={styles.inlineLink}
                  onPress={() => Linking.openURL(seg.text)}
                >
                  {seg.text}
                </Text>
              ) : (
                <Text key={i}>{seg.text}</Text>
              ),
            )}
            {message.streaming && <BlinkingCursor color={textColor} />}
          </Text>
        )}

        {/* Link preview — arrives async via the 'chat:message:linkpreview' socket event, after the message itself */}
        {message.linkPreview && (
          <TouchableOpacity
            onPress={() => Linking.openURL(message.linkPreview!.url)}
            style={[styles.linkPreview, { backgroundColor: palette.background, borderColor: palette.border }]}
            activeOpacity={0.8}
          >
            {message.linkPreview.image && (
              <Image source={{ uri: message.linkPreview.image }} style={styles.linkPreviewImg} resizeMode="cover" />
            )}
            <View style={styles.linkPreviewBody}>
              <Text style={[styles.linkPreviewTitle, { color: palette.text }]} numberOfLines={2}>{message.linkPreview.title}</Text>
              {!!message.linkPreview.description && (
                <Text style={[styles.linkPreviewDesc, { color: palette.textMuted }]} numberOfLines={2}>{message.linkPreview.description}</Text>
              )}
              <View style={styles.linkPreviewSiteRow}>
                {message.linkPreview.favicon && (
                  <Image source={{ uri: message.linkPreview.favicon }} style={styles.linkPreviewFavicon} />
                )}
                <Text style={[styles.linkPreviewSite, { color: palette.textSubtle }]} numberOfLines={1}>
                  {message.linkPreview.siteName || hostnameOf(message.linkPreview.url)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {message.metadata?.articles?.map((cite) => (
          <CitationChip key={cite.id} id={cite.id} title={cite.title} palette={palette} textColor={textColor} theme={theme} />
        ))}

        {isPending ? (
          <SendingDots color={isVisitor ? onBubble : palette.textSubtle} />
        ) : isFailed ? (
          <Text style={styles.retryLabel}>Tap to retry ↺</Text>
        ) : message.streaming ? null : (
          <Text style={[styles.time, { color: isVisitor ? onBubble : palette.textSubtle, opacity: isVisitor ? 0.75 : 1 }]}>
            {formatTime(message.createdAt)}
            {isVisitor && message.status === 'read' && '  ✓✓'}
            {isVisitor && message.status === 'delivered' && '  ✓'}
            {isVisitor && message.status === 'sent' && '  ✓'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 2,
    paddingHorizontal: 12,
  },
  rowRight: { flexDirection: 'row-reverse' },
  rowPending: { opacity: 0.65 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    marginRight: 6,
  },
  avatarText: { fontSize: 12, color: '#fff' },
  avatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginBottom: 4,
    marginRight: 6,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  bubbleFailed: { borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)' },
  senderName: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  body: { fontSize: 15, lineHeight: 21 },
  inlineLink: { textDecorationLine: 'underline' },
  time: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  retryLabel: { fontSize: 11, color: '#dc2626', marginTop: 4, fontWeight: '500' },
  attachmentImg: { width: 200, height: 150, borderRadius: 8 },
  attachmentFile: { paddingVertical: 4 },
  attachmentFileName: { fontSize: 13 },
  linkPreview: {
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    overflow: 'hidden',
    maxWidth: 220,
  },
  linkPreviewImg: { width: '100%', height: 110 },
  linkPreviewBody: { padding: 8 },
  linkPreviewTitle: { fontSize: 12.5, fontWeight: '600', lineHeight: 16 },
  linkPreviewDesc: { fontSize: 11.5, marginTop: 2, lineHeight: 15 },
  linkPreviewSiteRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  linkPreviewFavicon: { width: 11, height: 11, borderRadius: 2 },
  linkPreviewSite: { fontSize: 10, flexShrink: 1 },
  citationChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  citationChipText: { fontSize: 12, flex: 1 },
});
