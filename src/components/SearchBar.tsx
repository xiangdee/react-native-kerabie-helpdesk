import React, { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useKerAbieContext } from '../provider/KerAbieContext';
import { GradientLayer, gradientColors } from './GradientLayer';
import { DEFAULT_PRIMARY_COLOR, usePalette } from '../theme/palette';
import { AttachmentService } from '../services/attachment.service';
import { useAttachmentStaging } from '../hooks/useAttachmentStaging';

interface Props {
  style?: ViewStyle;
}

/**
 * The "search bar" launcher (dashboard: Launcher > Search bar) — a wide
 * "Ask anything…" input docked to the top or bottom of the screen, never the
 * sides. Pressing send opens the chat and sends what was typed. A file picked
 * with the paperclip stays in the bar and uploads first (Send waits for it),
 * exactly like the chat's composer — the chat opens only on Send. Renders
 * nothing unless the org picked the search-bar launcher; KerAbieFloatingButton
 * is its bubble-mode counterpart, so apps can render both and let the dashboard decide.
 */
export function KerAbieSearchBar({ style }: Props) {
  const ctx = useKerAbieContext();
  const { config, open, openWithDraft, isOpen } = ctx;
  const [text, setText] = useState('');
  const [showChooser, setShowChooser] = useState(false);
  const {
    pendingAttachment, isUploading, attachmentError,
    stageAttachment, removeAttachment, showAttachmentError, dismissAttachmentError,
  } = useAttachmentStaging();

  // Hooks first, then the early return.
  const palette = usePalette(config.theme);
  if (config.launcherType !== 'searchbar' || config.hideFloatingButton || isOpen) return null;

  const atTop = config.position?.startsWith('top');

  const pick = async (kind: 'photo' | 'document') => {
    setShowChooser(false);
    try {
      const file = kind === 'photo' ? await AttachmentService.pickImage() : await AttachmentService.pickDocument();
      await stageAttachment(file);
    } catch (err) {
      showAttachmentError(err instanceof Error ? err.message : 'Could not open the picker');
    }
  };

  const submit = () => {
    if (isUploading) return;
    const body = text.trim();
    setText('');
    if (body || pendingAttachment) openWithDraft({ text: body });
    else open();
  };

  const notes = (
    <>
      {attachmentError && (
        <View style={[styles.note, { backgroundColor: palette.background, borderColor: '#fca5a5' }]}>
          <Text style={[styles.noteText, { color: '#dc2626' }]} numberOfLines={2}>{attachmentError}</Text>
          <TouchableOpacity onPress={dismissAttachmentError}><Text style={{ color: palette.textMuted }}>✕</Text></TouchableOpacity>
        </View>
      )}
      {showChooser && (
        <View style={[styles.note, { backgroundColor: palette.background, borderColor: palette.border }]}>
          <TouchableOpacity onPress={() => pick('photo')} style={styles.choice}><Text style={{ color: palette.text }}>🖼  Photo</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => pick('document')} style={styles.choice}><Text style={{ color: palette.text }}>📄  Document</Text></TouchableOpacity>
        </View>
      )}
      {pendingAttachment && (
        <View style={[styles.note, { backgroundColor: palette.background, borderColor: palette.border }]}>
          {pendingAttachment.isImage
            ? <Image source={{ uri: pendingAttachment.uri }} style={styles.thumb} />
            : <Text style={{ fontSize: 18 }}>📎</Text>}
          <Text style={[styles.noteText, { color: palette.text }]} numberOfLines={1}>{pendingAttachment.name}</Text>
          {isUploading && <ActivityIndicator size="small" color={palette.textMuted} />}
          <TouchableOpacity onPress={removeAttachment} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ color: palette.textMuted }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const bar = (
    <View style={[styles.bar, { backgroundColor: palette.background, borderColor: palette.border }]}>
      <TouchableOpacity
        onPress={() => setShowChooser((v) => !v)}
        disabled={!!pendingAttachment}
        style={[styles.attach, pendingAttachment ? { opacity: 0.4 } : null]}
        accessibilityLabel="Send attachment"
      >
        <Text style={{ fontSize: 18, color: palette.textMuted }}>📎</Text>
      </TouchableOpacity>
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={submit}
        placeholder={config.searchbarPlaceholder}
        placeholderTextColor={palette.textSubtle}
        returnKeyType="send"
        style={[styles.input, { color: palette.text, fontFamily: config.theme.fontFamily }]}
      />
      <TouchableOpacity onPress={submit} disabled={isUploading} style={[styles.send, isUploading ? { opacity: 0.5 } : null]} accessibilityLabel="Start chat">
        <View style={[StyleSheet.absoluteFill, styles.sendBg, { backgroundColor: config.theme.primaryColor ?? DEFAULT_PRIMARY_COLOR }]} pointerEvents="none">
          <GradientLayer colors={gradientColors(config.theme)} />
        </View>
        <Text style={styles.arrow}>→</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, atTop ? { top: 60 } : { bottom: 24 }, style]}>
      {/* At the top edge the staged file sits below the bar, not above it. */}
      {atTop ? <>{bar}{notes}</> : <>{notes}{bar}</>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: 16, right: 16, gap: 8 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 32,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
  },
  note: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  noteText: { fontSize: 12, flexShrink: 1 },
  choice: { paddingVertical: 4, paddingHorizontal: 6 },
  thumb: { width: 32, height: 32, borderRadius: 6 },
  attach: { width: 32, height: 32, marginLeft: -12, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, fontSize: 15, paddingVertical: 8 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sendBg: { borderRadius: 20, overflow: 'hidden' },
  arrow: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
