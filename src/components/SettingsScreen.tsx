import React, { useCallback, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useKerAbieContext } from '../provider/KerAbieContext';
import { KerTheme } from '../types';
import { KerPalette } from '../theme/palette';
import { ApiService } from '../services/api.service';
import { KerModal } from './KerModal';

interface Props {
  theme: KerTheme;
  palette: KerPalette;
}

type ModalName = 'name' | 'email' | 'erase' | null;
type Notice = 'name' | 'download' | 'email' | 'data';

const NOTICE_MS = 3000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DANGER = '#dc2626';

// Change Name, Download/Email Transcript and GDPR data export/erase — the
// rows the web widget's HelpScreen.vue has. FAQ is a bigger separate feature
// and Accessibility is handled by the OS on native, so both are skipped.
export function SettingsScreen({ theme, palette }: Props) {
  const ctx = useKerAbieContext();
  const conversationId = ctx.currentConversation?.id ?? null;

  const [modal, setModal] = useState<ModalName>(null);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState('');
  const [name, setName] = useState('');
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

  const saveName = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;
    ctx.setUser({ ...ctx.currentUser, name: trimmed });
    setModal(null);
    flash('name', '✓ Saved!');
  }, [ctx, name, flash]);

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
      flash('email', '✓ Sent!');
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

  return (
    <ScrollView style={[styles.root, { backgroundColor: palette.background }]} contentContainerStyle={{ padding: 16, gap: 4 }}>
      <TouchableOpacity
        style={styles.row}
        onPress={() => {
          setName(ctx.currentUser?.name ?? '');
          openModal('name');
        }}
      >
        <Text style={[styles.rowLabel, text]}>Change Name</Text>
        <Text style={[styles.rowHint, muted]}>{notice.name || ctx.currentUser?.name || 'Set the name shown to our team'}</Text>
      </TouchableOpacity>

      {!!conversationId && (
        <>
          <TouchableOpacity style={styles.row} onPress={downloadTranscript}>
            <Text style={[styles.rowLabel, text]}>Download Transcript</Text>
            <Text style={[styles.rowHint, muted]}>{notice.download || 'Share a copy of your chat history'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              setEmailInput(ctx.currentUser?.email ?? '');
              openModal('email');
            }}
          >
            <Text style={[styles.rowLabel, text]}>Email Transcript</Text>
            <Text style={[styles.rowHint, muted]}>{notice.email || 'Send transcript to your email'}</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={[styles.divider, { backgroundColor: palette.border }]} />

      <TouchableOpacity style={styles.row} onPress={downloadMyData}>
        <Text style={[styles.rowLabel, text]}>Download my data</Text>
        <Text style={[styles.rowHint, muted]}>{notice.data || 'Get a copy of the data we hold about you'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.row} onPress={() => openModal('erase')}>
        <Text style={[styles.rowLabel, { color: DANGER, fontFamily: theme.fontFamily }]}>Delete my data</Text>
        <Text style={[styles.rowHint, muted]}>Permanently erase your conversations and contact details</Text>
      </TouchableOpacity>

      <KerModal
        visible={modal === 'name'}
        title="Change name"
        onClose={() => setModal(null)}
        theme={theme}
        palette={palette}
        footer={<>{cancelBtn}{primaryBtn('Save', saveName, !name.trim())}</>}
      >
        <Text style={[styles.rowHint, muted]}>This is the name our team sees in your conversations.</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={palette.textSubtle}
          maxLength={80}
          autoFocus
          onSubmitEditing={saveName}
          style={inputStyle}
        />
      </KerModal>

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
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  row: { paddingVertical: 10 },
  rowLabel: { fontSize: 14, fontWeight: '600' },
  rowHint: { fontSize: 12.5, marginTop: 2 },
});
