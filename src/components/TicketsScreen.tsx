import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useKerAbieTickets } from '../hooks/useKerAbieTickets';
import { TicketDetailScreen } from './TicketDetailScreen';
import { Skeleton } from './Skeleton';
import { usePalette, withAlpha } from '../theme/palette';
import type { KerTheme, KerTicket, KerTicketPriority } from '../types';

interface Props {
  onClose: () => void;
  theme: KerTheme;
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#94a3b8',
  NORMAL: '#6366f1',
  HIGH: '#f59e0b',
  URGENT: '#ef4444',
};

// Status pill colours follow the web widget: in progress amber, resolved green, anything else blue.
function statusStyle(status: string) {
  const key = (status || '').toUpperCase();
  if (key === 'RESOLVED' || key === 'CLOSED') return { label: key === 'CLOSED' ? 'Closed' : 'Resolved', bg: '#dff5ea', fg: '#17694a' };
  if (key === 'PENDING' || key === 'IN_PROGRESS') return { label: 'In progress', bg: '#fff3d6', fg: '#8a5a00' };
  return { label: 'Open', bg: '#e3edff', fg: '#1d4ed8' };
}

function ago(iso?: string | null) {
  if (!iso) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

const PRIORITIES: KerTicketPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

function NewTicketForm({ onCancel, onCreated, theme }: { onCancel: () => void; onCreated: (id: number) => void; theme: KerTheme }) {
  const { createTicket } = useKerAbieTickets();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<KerTicketPriority>('NORMAL');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const palette = usePalette(theme);
  const primary = palette.primary;
  const textColor = palette.text;

  const submit = useCallback(async () => {
    if (!message.trim() || submitting) return;
    setSubmitting(true);
    const result = await createTicket({ subject: subject.trim() || 'New ticket', message: message.trim(), priority, email: email.trim() || undefined });
    setSubmitting(false);
    if (result) onCreated(result.ticketId);
  }, [subject, message, priority, email, submitting, createTicket, onCreated]);

  return (
    <View style={styles.form}>
      <Text style={[styles.label, { color: textColor }]}>Subject</Text>
      <TextInput
        value={subject}
        onChangeText={setSubject}
        placeholder="What do you need help with?"
        placeholderTextColor={palette.textSubtle}
        style={[styles.input, { color: textColor, borderColor: palette.borderStrong, backgroundColor: palette.inputBackground }]}
      />

      <Text style={[styles.label, { color: textColor }]}>Message</Text>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Describe your issue…"
        placeholderTextColor={palette.textSubtle}
        style={[styles.input, styles.textarea, { color: textColor, borderColor: palette.borderStrong, backgroundColor: palette.inputBackground }]}
        multiline
      />

      <Text style={[styles.label, { color: textColor }]}>Email (optional — get updates by email)</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={palette.textSubtle}
        keyboardType="email-address"
        autoCapitalize="none"
        style={[styles.input, { color: textColor, borderColor: palette.borderStrong, backgroundColor: palette.inputBackground }]}
      />

      <Text style={[styles.label, { color: textColor }]}>Priority</Text>
      <View style={styles.priorityRow}>
        {PRIORITIES.map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setPriority(p)}
            style={[
              styles.priorityChip,
              { borderColor: PRIORITY_COLORS[p] },
              priority === p && { backgroundColor: PRIORITY_COLORS[p] },
            ]}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: priority === p ? '#ffffff' : PRIORITY_COLORS[p] }}>
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.formActions}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Text style={{ color: palette.textMuted, fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={submit}
          disabled={!message.trim() || submitting}
          style={[styles.submitBtn, { backgroundColor: primary, opacity: message.trim() ? 1 : 0.5 }]}
        >
          {submitting ? <ActivityIndicator color={palette.onPrimary} size="small" /> : <Text style={[styles.submitBtnText, { color: palette.onPrimary }]}>Submit ticket</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function TicketsScreen({ onClose, theme }: Props) {
  const { tickets, loading, fetchTickets } = useKerAbieTickets();
  const [mode, setMode] = useState<'list' | 'new'>('list');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const palette = usePalette(theme);
  const primary = palette.primary;
  const background = palette.background;
  const textColor = palette.text;

  if (selectedId != null) {
    return <TicketDetailScreen ticketId={selectedId} theme={theme} onClose={() => { setSelectedId(null); fetchTickets(); }} />;
  }

  const renderItem = ({ item }: { item: KerTicket }) => (
    <TouchableOpacity activeOpacity={0.8} style={[styles.row, { backgroundColor: palette.surface }]} onPress={() => setSelectedId(item.id)}>
      <View style={styles.rowTop}>
        <Text numberOfLines={1} style={[styles.rowTitle, { color: textColor }]}>{item.subject ?? `Ticket #${item.id}`}</Text>
        <View style={[styles.pill, { backgroundColor: statusStyle(item.status).bg }]}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: statusStyle(item.status).fg }}>{statusStyle(item.status).label}</Text>
        </View>
      </View>
      <Text style={[styles.metaText, { color: palette.textMuted }]}>
        #{item.id} · {item.priority.charAt(0) + item.priority.slice(1).toLowerCase()} priority · {ago((item as any).lastMessageAt ?? (item as any).createdAt)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textColor }]}>{mode === 'new' ? 'New ticket' : 'Tickets'}</Text>
        <TouchableOpacity onPress={mode === 'new' ? () => setMode('list') : onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.close, { color: palette.accent }]}>{mode === 'new' ? 'Back' : 'Close'}</Text>
        </TouchableOpacity>
      </View>

      {mode === 'new' ? (
        <NewTicketForm
          theme={theme}
          onCancel={() => setMode('list')}
          onCreated={(id) => { setMode('list'); setSelectedId(id); }}
        />
      ) : (
        <>
          <View style={styles.listHead}>
            <Text style={[styles.listTitle, { color: textColor }]}>Your tickets</Text>
            <TouchableOpacity onPress={() => setMode('new')} style={[styles.newBtn, { backgroundColor: primary }]}>
              <Text style={[styles.newBtnText, { color: palette.onPrimary }]}>+ New ticket</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.list}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[styles.row, { borderBottomColor: palette.border }]}>
                  <Skeleton color={palette.surfaceStrong} height={14} width={i % 2 === 0 ? '75%' : '55%'} />
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <Skeleton color={palette.surfaceStrong} height={16} width={54} borderRadius={999} />
                    <Skeleton color={palette.surfaceStrong} height={16} width={70} borderRadius={999} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <FlatList
              data={tickets}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<Text style={[styles.empty, { color: palette.textSubtle }]}>No tickets yet.</Text>}
            />
          )}
        </>
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
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10 },
  listTitle: { fontSize: 16, fontWeight: '800' },
  newBtn: { height: 34, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  newBtnText: { fontWeight: '700', fontSize: 13 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 14, paddingBottom: 24, gap: 10 },
  row: { padding: 14, borderRadius: 14 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  metaText: { fontSize: 12.5, marginTop: 4 },
  empty: { textAlign: 'center', fontSize: 13, marginTop: 32 },
  form: { paddingHorizontal: 16, paddingTop: 8, gap: 4 },
  label: { fontSize: 12.5, fontWeight: '600', marginTop: 10, marginBottom: 5 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  textarea: { height: 90, textAlignVertical: 'top' },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  submitBtn: { flex: 2, alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
  submitBtnText: { fontWeight: '700', fontSize: 14 },
});
