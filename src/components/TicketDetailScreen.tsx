import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useKerAbieTickets } from '../hooks/useKerAbieTickets';
import { Skeleton } from './Skeleton';
import { usePalette, withAlpha } from '../theme/palette';
import type { KerTheme, KerTicket, KerTicketMessage } from '../types';

interface Props {
  ticketId: number;
  onClose: () => void;
  theme: KerTheme;
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#94a3b8',
  NORMAL: '#6366f1',
  HIGH: '#f59e0b',
  URGENT: '#ef4444',
};

export function TicketDetailScreen({ ticketId, onClose, theme }: Props) {
  const { getTicket, replyToTicket } = useKerAbieTickets();
  const [ticket, setTicket] = useState<KerTicket | null>(null);
  const [messages, setMessages] = useState<KerTicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const palette = usePalette(theme);
  const primary = palette.primary;
  const background = palette.background;
  const textColor = palette.text;

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getTicket(ticketId);
    if (result) {
      setTicket(result.ticket);
      setMessages(result.messages ?? []);
    }
    setLoading(false);
  }, [getTicket, ticketId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (messages.length > 0) listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setDraft('');
    setSending(true);
    const ok = await replyToTicket(ticketId, body);
    if (ok) await load();
    setSending(false);
  }, [draft, sending, replyToTicket, ticketId, load]);

  const renderItem = ({ item }: { item: KerTicketMessage }) => {
    const isAgent = item.senderRole === 'agent';
    return (
      <View style={[styles.bubbleRow, isAgent ? styles.bubbleRowLeft : styles.bubbleRowRight]}>
        <View
          style={[
            styles.bubble,
            isAgent
              ? { backgroundColor: palette.agentBubble, borderTopLeftRadius: 4 }
              : { backgroundColor: primary, borderTopRightRadius: 4 },
          ]}
        >
          {isAgent && item.senderName && (
            <Text style={[styles.senderName, { color: palette.textMuted }]}>{item.senderName}</Text>
          )}
          <Text style={{ color: isAgent ? textColor : palette.onPrimary, fontSize: 14 }}>{item.body}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.close, { color: palette.accent }]}>{'‹ Back'}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text numberOfLines={1} style={[styles.headerTitle, { color: textColor }]}>
            {ticket?.subject ?? `Ticket #${ticketId}`}
          </Text>
          {ticket && (
            <View style={styles.metaRow}>
              <View style={[styles.pill, { backgroundColor: withAlpha(PRIORITY_COLORS[ticket.priority] ?? primary, 0.12) }]}>
                <Text style={{ fontSize: 10.5, fontWeight: '600', color: PRIORITY_COLORS[ticket.priority] ?? primary }}>
                  {ticket.priority}
                </Text>
              </View>
              <Text style={[styles.metaText, { color: palette.textSubtle }]}>{ticket.status}</Text>
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.list}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.bubbleRow, i % 2 === 0 ? styles.bubbleRowLeft : styles.bubbleRowRight]}>
              <Skeleton color={palette.surfaceStrong} width={i % 3 === 0 ? '65%' : '45%'} height={38} borderRadius={16} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.inputBar, { borderTopColor: palette.border }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Write a reply…"
            placeholderTextColor={palette.textSubtle}
            style={[styles.input, { color: textColor, borderColor: palette.borderStrong, backgroundColor: palette.inputBackground }]}
            multiline
            editable={ticket?.status !== 'CLOSED'}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={sending || !draft.trim() || ticket?.status === 'CLOSED'}
            style={[styles.sendBtn, { backgroundColor: primary, opacity: draft.trim() ? 1 : 0.5 }]}
          >
            <Text style={[styles.sendBtnText, { color: palette.onPrimary }]}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 15.5, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  pill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  metaText: { fontSize: 11, fontWeight: '600' },
  close: { fontSize: 14, fontWeight: '600' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9 },
  senderName: { fontSize: 10.5, fontWeight: '700', marginBottom: 2 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  sendBtnText: { fontWeight: '700', fontSize: 13 },
});
