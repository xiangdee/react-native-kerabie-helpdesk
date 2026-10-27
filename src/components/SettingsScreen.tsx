import React, { useCallback, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useKerAbieContext } from '../provider/KerAbieContext';
import { KerTheme } from '../types';
import { KerPalette } from '../theme/palette';
import { ApiService } from '../services/api.service';
import { KerModal } from './KerModal';
import { Icon, IconName } from './Icon';

interface Props {
  theme: KerTheme;
  palette: KerPalette;
  /** Rendered under the options card (the Help tab puts the FAQs here). */
  children?: React.ReactNode;
}

type ModalName = 'email' | 'erase' | null;
type Notice = 'download' | 'email' | 'data';

const NOTICE_MS = 3000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DANGER = '#dc2626';

// Download/Email Transcript and GDPR data export/erase — the rows the web widget's HelpScreen.vue has. Change
// name is left out: the app already identifies the visitor (setUser), and anonymous visitors give their name in
// the pre-chat form. Accessibility is handled by the OS on native.
export function SettingsScreen({ theme, palette, children }: Props) {
  const ctx = useKerAbieContext();
  const conversationId = ctx.currentConversation?.id ?? null;

  const [modal, setModal] = useState<ModalName>(null);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState('');
  const [emailInput, setEmailInput] = useState('');

  // Short-lived status text under each row's title.
  const [notice, setNotice] = useState<Partial<Record<Notice, string>>>({});
  const flash = useCallback((key: Notice, text: string) => {
    setNotice((n) => ({ ...n, [key]: text }));
    setTimeout(() => setNotice((n) => ({ ...n, [key]: undefined })), NOTICE_MS);
  }, []);

  const openModal = (next: ModalName) => {
    setModalError('');
    setModal(next);
  };

  const downloadTranscript = useCallback(async () => {
    if (!conversationId) return flash('download', 'No conversation to download yet');
    try {
      // No filesystem download UI on mobile the way a browser has — the
      // native Share sheet (save/copy/AirDrop/etc.) is the RN equivalent.
      const res = await ApiService.get<{ transcript?: string }>(`/public/widget/conversations/${conversationId}/export`);
      if (!res.transcript) throw new Error();
      await Share.share({ message: res.transcript });
    } catch {
      flash('download', "Couldn't download — try again");
    }
  }, [conversationId, flash]);

  const sendEmailTranscript = useCallback(async () => {
    const email = emailInput.trim();
    if (!conversationId) return;
    if (!EMAIL_RE.test(email)) return setModalError('Enter a valid email address');
    setBusy(true);
    setModalError('');
    try {
      await ApiService.post(`/public/widget/conversations/${conversationId}/export/email`, { email });
      setModal(null);
      flash('email', 'Sent');
    } catch {
      setModalError("Couldn't send the email — try again");
    } finally {
      setBusy(false);
    }
  }, [conversationId, emailInput, flash]);

  // GDPR & Privacy — same /public/widget/my-data endpoints as the web widget.
  // Accessibility has no equivalent: native text size / contrast / reduce-motion
  // are OS-level settings the app already follows.
  const downloadMyData = useCallback(async () => {
    try {
      const data = await ApiService.get('/public/widget/my-data');
      if (!data.profile && !data.conversations?.length) return flash('data', "We don't hold any data about you yet.");
      await Share.share({ message: JSON.stringify(data, null, 2) });
    } catch {
      flash('data', "Couldn't download your data — try again");
    }
  }, [flash]);

  const deleteMyData = useCallback(async () => {
    setBusy(true);
    setModalError('');
    try {
      await ApiService.delete('/public/widget/my-data');
      setModal(null);
      flash('data', 'Your data has been deleted.');
    } catch {
      setModalError("Couldn't delete your data — try again");
    } finally {
      setBusy(false);
    }
  }, [flash]);

  const text = { color: palette.text, fontFamily: theme.fontFamily };
  const muted = { color: palette.textMuted, fontFamily: theme.fontFamily };
  const inputStyle = [styles.input, { borderColor: palette.border, color: palette.text, backgroundColor: palette.inputBackground }];

  const cancelBtn = (
    <TouchableOpacity
      style={[styles.btn, { borderWidth: StyleSheet.hairlineWidth, borderColor: palette.border }]}
      onPress={() => setModal(null)}
      disabled={busy}
    >
      <Text style={[styles.btnText, { color: palette.text }]}>Cancel</Text>
    </TouchableOpacity>
  );
  const primaryBtn = (label: string, onPress: () => void, disabled: boolean, color = palette.primary, textColor = palette.onPrimary) => (
    <TouchableOpacity style={[styles.btn, { backgroundColor: color, opacity: disabled ? 0.5 : 1 }]} onPress={onPress} disabled={disabled}>
      <Text style={[styles.btnText, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
  const error = !!modalError && <Text style={[styles.rowHint, { color: DANGER, fontFamily: theme.fontFamily }]}>{modalError}</Text>;

  const row = (icon: IconName, label: string, hint: string, onPress: () => void, opts?: { danger?: boolean; first?: boolean }) => (
    <TouchableOpacity
      style={[styles.row, !opts?.first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.rowIcon, { backgroundColor: opts?.danger ? '#fee2e2' : palette.primary }]}>
        <Icon name={icon} size={16} color={opts?.danger ? DANGER : palette.onPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, opts?.danger ? { color: DANGER, fontFamily: theme.fontFamily } : text]}>{label}</Text>
        <Text style={[styles.rowHint, muted]}>{hint}</Text>
      </View>
      <Icon name="forward" size={16} color={palette.textSubtle} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[styles.root, { backgroundColor: palette.surface }]} contentContainerStyle={{ padding: 14, paddingBottom: 24 }}>
      <Text style={[styles.sectionLabel, muted]}>Options</Text>
      <View style={[styles.card, { backgroundColor: palette.background }]}>
        {!!conversationId && row('download', 'Download Transcript', notice.download || 'Share a copy of your chat history', downloadTranscript, { first: true })}
        {!!conversationId && row('mail', 'Email Transcript', notice.email || 'Send transcript to your email', () => {
          setEmailInput(ctx.currentUser?.email ?? '');
          openModal('email');
        })}
        {row('shield', 'Download my data', notice.data || 'Get a copy of the data we hold about you', downloadMyData, { first: !conversationId })}
        {row('trash', 'Delete my data', 'Permanently erase your conversations and contact details', () => openModal('erase'), { danger: true })}
      </View>

      {children}

      <KerModal
        visible={modal === 'email'}
        title="Email transcript"
        onClose={() => setModal(null)}
        theme={theme}
        palette={palette}
        footer={<>{cancelBtn}{primaryBtn(busy ? 'Sending…' : 'Send', sendEmailTranscript, busy || !emailInput.trim())}</>}
      >
        <Text style={[styles.rowHint, muted]}>We'll send a copy of this conversation to:</Text>
        <TextInput
          value={emailInput}
          onChangeText={setEmailInput}
          placeholder="your@email.com"
          placeholderTextColor={palette.textSubtle}
          keyboardType="email-address"
          autoCapitalize="none"
          autoFocus
          onSubmitEditing={sendEmailTranscript}
          style={inputStyle}
        />
        {error}
      </KerModal>

      <KerModal
        visible={modal === 'erase'}
        title="Delete my data"
        onClose={() => setModal(null)}
        theme={theme}
        palette={palette}
        footer={<>{cancelBtn}{primaryBtn(busy ? 'Deleting…' : 'Yes, delete', deleteMyData, busy, DANGER, '#fff')}</>}
      >
        <Text style={[styles.rowHint, text]}>
          This permanently deletes your conversations and contact details from this chat. It can't be undone.
        </Text>
        {error}
      </KerModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  btn: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  btnText: { fontSize: 14, fontWeight: '600' },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginHorizontal: 4, marginBottom: 10 },
  card: { borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  rowIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '600' },
  rowHint: { fontSize: 12.5, marginTop: 2 },
});
