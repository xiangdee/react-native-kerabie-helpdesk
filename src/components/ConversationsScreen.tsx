import React, { useEffect } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useKerAbieContext } from '../provider/KerAbieContext';
import type { KerChatSettings, KerConversationSummary, KerTheme } from '../types';
import type { KerPalette } from '../theme/palette';
import { gradientColors, GradientLayer } from './GradientLayer';
import { Icon } from './Icon';
import { Skeleton } from './Skeleton';

interface Props {
  theme: KerTheme;
  palette: KerPalette;
  chatSettings?: KerChatSettings;
  onOpen: (id: number) => void;
  onNew: () => void;
}

function formatTime(value: string): string {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 24 * 60 * 60 * 1000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 7 * 24 * 60 * 60 * 1000) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function truncate(message: string, max = 60): string {
  return message.length > max ? `${message.slice(0, max)}...` : message;
}

// The Chat tab in the full layout — same as the web widget's ConversationsScreen.vue: the visitor's past chats
// with a New Chat button, or a "Start a conversation" prompt when there are none.
export function ConversationsScreen({ theme, palette, chatSettings, onOpen, onNew }: Props) {
  const ctx = useKerAbieContext();
  const font = theme.fontFamily;
  const { refreshConversations } = ctx;
  // With "save chat history" off in the dashboard, past conversations are hidden.
  const list: KerConversationSummary[] = chatSettings?.chatHistoryEnabled === false ? [] : ctx.conversations;
  const loading = chatSettings?.chatHistoryEnabled !== false && !ctx.conversationsLoaded && list.length === 0;

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  const fallbackName = chatSettings?.name ?? ctx.appName ?? 'Support';

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Text style={[styles.title, { color: palette.text, fontFamily: font }]}>Chats</Text>
        {list.length > 0 && (
          <TouchableOpacity onPress={onNew} style={[styles.newBtn, { backgroundColor: palette.primary }]} activeOpacity={0.85}>
            <GradientLayer colors={gradientColors(theme)} />
            <Icon name="plus" size={14} color={palette.onPrimary} strokeWidth={2.2} />
            <Text style={[styles.newText, { color: palette.onPrimary, fontFamily: font }]}>New chat</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.row}>
              <Skeleton width={44} height={44} borderRadius={22} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width={i % 2 ? '40%' : '55%'} height={14} />
                <Skeleton width="80%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : list.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: palette.surface }]}>
            <Icon name="chat" size={30} color={palette.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: palette.text, fontFamily: font }]}>Start a conversation</Text>
          <Text style={[styles.emptyText, { color: palette.textMuted, fontFamily: font }]}>
            Ask a question and get an answer in seconds. Prefer a person? Just say so and we will hand over.
          </Text>
          <TouchableOpacity onPress={onNew} style={[styles.startBtn, { backgroundColor: palette.primary }]} activeOpacity={0.85}>
            <GradientLayer colors={gradientColors(theme)} />
            <Text style={[styles.startText, { color: palette.onPrimary, fontFamily: font }]}>Start chat</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {list.map((c) => {
            const avatar = c.avatar || chatSettings?.logoUrl;
            const name = c.name || fallbackName;
            return (
              <TouchableOpacity key={c.id} style={styles.row} onPress={() => onOpen(c.id)} activeOpacity={0.7}>
                <View>
                  <View style={[styles.avatar, { backgroundColor: palette.surface }]}>
                    {avatar ? (
                      <Image source={{ uri: avatar }} style={styles.avatarImg} />
                    ) : (
                      <Text style={[styles.avatarLetter, { color: palette.accent, fontFamily: font }]}>{name.charAt(0).toUpperCase()}</Text>
                    )}
                  </View>
                  {c.isOnline && <View style={[styles.online, { borderColor: palette.background }]} />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: palette.text, fontFamily: font }]} numberOfLines={1}>{name}</Text>
                    <Text style={[styles.time, { color: palette.textSubtle, fontFamily: font }]}>{formatTime(c.lastMessageTime)}</Text>
                  </View>
                  <Text style={[styles.preview, { color: palette.textMuted, fontFamily: font }]} numberOfLines={1}>{truncate(c.lastMessage ?? '')}</Text>
                </View>
                {c.unreadCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: palette.primary }]}>
                    <Text style={[styles.badgeText, { color: palette.onPrimary }]}>{c.unreadCount > 99 ? '99+' : c.unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 16, fontWeight: '700' },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, overflow: 'hidden' },
  newText: { fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 44, height: 44 },
  avatarLetter: { fontSize: 17, fontWeight: '700' },
  online: { position: 'absolute', right: 0, bottom: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', borderWidth: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 14.5, fontWeight: '600' },
  time: { fontSize: 11.5 },
  preview: { fontSize: 13, marginTop: 3 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyText: { fontSize: 13.5, lineHeight: 20, textAlign: 'center', marginTop: 6 },
  startBtn: { marginTop: 18, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 12, overflow: 'hidden' },
  startText: { fontSize: 14, fontWeight: '600' },
});
