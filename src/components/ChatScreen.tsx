import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Linking,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useKerAbieContext } from '../provider/KerAbieContext';
import { personalize } from '../utils/personalize';
import { KerChatSettings, KerEnrichmentField, KerMessage, KerTheme, KerUser } from '../types';
import { PreChatForm } from './PreChatForm';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { AiOrb } from './AiOrb';
import { gradientColors } from './GradientLayer';
import { InputBar, PendingAttachment } from './InputBar';
import { ImageViewerModal } from './ImageViewerModal';
import { SettingsScreen } from './SettingsScreen';
import { KerModal } from './KerModal';
import { socketService } from '../services/socket.service';
import { AttachmentService } from '../services/attachment.service';
import { useAttachmentStaging } from '../hooks/useAttachmentStaging';
import { usePalette } from '../theme/palette';

const DEFAULT_PRE_CHAT_FIELDS: KerEnrichmentField[] = [
  { key: 'name', label: 'Your name', type: 'text', required: false, placeholder: 'Your name' },
  { key: 'email', label: 'Email address', type: 'email', required: false, placeholder: 'Email address' },
];

interface Props {
  onClose: () => void;
  theme: KerTheme;
  chatSettings?: KerChatSettings;
}

export function ChatScreen({ onClose, theme, chatSettings }: Props) {
  const ctx = useKerAbieContext();
  const listRef = useRef<FlatList>(null);
  const conversationId = ctx.currentConversation?.id ?? null;

  // conversationId is null until the visitor's first message creates the
  // conversation server-side (visitor:message without an id) — the composer
  // works either way. No explicit room-join is needed: the server joins the
  // visitor's socket to open conversations on visitor:init and to a new one
  // when it's created.

  // Composer text is owned here (rather than inside InputBar) so it can be
  // coordinated with pendingAttachment below — sending needs to combine
  // both into one ctx.sendMessage(body, attachments) call.
  const [text, setText] = useState('');
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTyping = useCallback(
    (isTyping: boolean) => {
      if (conversationId) socketService.sendTyping(conversationId, isTyping);
    },
    [conversationId],
  );

  const handleChangeText = useCallback(
    (val: string) => {
      setText(val);
      handleTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => handleTyping(false), 1500);
    },
    [handleTyping],
  );

  // Picked-but-not-yet-sent attachment (WhatsApp-style): uploads in the background right after
  // picking, but sending waits for the visitor to press Send, so a caption can be typed
  // alongside it. Shared with the search-bar launcher (hooks/useAttachmentStaging).
  const {
    pendingAttachment, isUploading, attachmentError, staged,
    stageAttachment, removeAttachment, consumeAttachment, showAttachmentError, dismissAttachmentError,
  } = useAttachmentStaging();

  // In-app Photo/Document chooser (KerModal) — no native popup.
  const [showAttachChooser, setShowAttachChooser] = useState(false);

  // Handed over by the search-bar launcher. The visitor already pressed Send there, so the text
  // (plus any attachment already uploaded in the bar) goes out now — unless the pre-chat form still
  // has to collect their details, in which case the text waits in the composer.
  useEffect(() => {
    if (!ctx.chatDraft) return;
    const { text: draftText } = ctx.chatDraft;
    ctx.clearChatDraft();
    if (showPreChatForm) { setText(draftText); return; }
    if (staged) void sendNow(draftText.trim());
    else if (draftText.trim()) void sendNow(draftText.trim());
  }, [ctx.chatDraft]); // eslint-disable-line react-hooks/exhaustive-deps
  const handleAttach = useCallback(() => setShowAttachChooser((v) => !v), []);

  const pickAttachment = useCallback(
    async (kind: 'photo' | 'document') => {
      setShowAttachChooser(false);
      try {
        const file = kind === 'photo' ? await AttachmentService.pickImage() : await AttachmentService.pickDocument();
        await stageAttachment(file);
      } catch (err) {
        showAttachmentError(
          err instanceof Error ? err.message : kind === 'photo' ? 'Could not open photo library' : 'Could not open document picker',
        );
      }
    },
    [stageAttachment, showAttachmentError],
  );

  const sendNow = useCallback(async (body: string) => {
    if (pendingAttachment) {
      if (isUploading || !staged) return; // still uploading — Send stays disabled meanwhile
      const { file, uploaded } = staged;
      setText('');
      consumeAttachment();
      await ctx.sendMessage(body, [
        {
          id: `att_${Date.now()}`,
          // Local file:// URI — used only for this client's own optimistic
          // bubble. The attachment is private; `key` is what the server
          // actually needs to resolve a signed URL once the message sends.
          url: file.uri,
          key: uploaded.key,
          type: uploaded.mimeType.startsWith('image/') ? 'image' : 'file',
          name: uploaded.fileName,
        },
      ]);
      return;
    }

    if (!body) return;
    setText('');
    handleTyping(false);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    ctx.sendMessage(body);
  }, [ctx, pendingAttachment, isUploading, staged, consumeAttachment, handleTyping]);

  const handleSend = useCallback(() => sendNow(text.trim()), [sendNow, text]);

  useEffect(() => {
    if (ctx.messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [ctx.messages.length]);

  const palette = usePalette(theme);

  const [viewingImageUri, setViewingImageUri] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const renderItem = ({ item }: { item: KerMessage }) => (
    <MessageBubble
      message={item}
      theme={theme}
      onRetry={item.status === 'failed' ? () => ctx.retryMessage(item) : undefined}
      onPressImage={setViewingImageUri}
    />
  );

  // Connection banner — shown once a drop has lasted 3s, so normal reconnects don't flash it.
  const [showOffline, setShowOffline] = useState(false);
  useEffect(() => {
    if (ctx.isConnected) { setShowOffline(false); return; }
    const t = setTimeout(() => setShowOffline(true), 3000);
    return () => clearTimeout(t);
  }, [ctx.isConnected]);

  // Pre-chat lead capture: no agent online AND no AI chatbot to fall back on
  // — the visitor has no way to get any reply right now, so ask for a way to
  // follow up. Mirrors the web widget's offline-gated enrichment form
  // (ChatScreen.vue's showEnrichmentForm/isOfflineNoBot).
  const isOfflineNoBot = ctx.onlineAgents === 0 && chatSettings?.chatbotEnabled !== true;
  // The org's own questions when it configured a pre-chat form; otherwise the built-in name + email form.
  const customFields = chatSettings?.customerEnrichmentEnabled ? chatSettings.customerEnrichmentForm?.fields ?? [] : [];
  const preChatFields = customFields.length > 0 ? customFields : DEFAULT_PRE_CHAT_FIELDS;
  const alreadyAnswered =
    !!ctx.currentUser?.name || !!ctx.currentUser?.email || Object.keys(ctx.currentUser?.customAttributes ?? {}).length > 0;
  const showPreChatForm =
    (chatSettings?.customerEnrichmentEnabled === true || isOfflineNoBot) && !alreadyAnswered && ctx.messages.length === 0;

  const submitPreChat = useCallback((answers: Record<string, string>) => {
    // name/email/phone are the contact's own fields; every other answer is a custom attribute.
    const user: KerUser = { ...ctx.currentUser };
    const custom: Record<string, string> = { ...(ctx.currentUser?.customAttributes ?? {}) };
    for (const f of preChatFields) {
      const v = (answers[f.key] ?? '').trim();
      if (!v) continue;
      if (f.key === 'name' || f.key === 'email' || f.key === 'phone') user[f.key] = v;
      else custom[f.key] = v;
    }
    if (Object.keys(custom).length) user.customAttributes = custom;
    // setUser persists to storage and POSTs /widget/identify (see KerAbieProvider.setUser) — the email
    // on file unlocks the backend's reply-by-email continuation once the conversation escalates.
    ctx.setUser(user);
  }, [ctx, preChatFields]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: palette.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        {showSettings ? (
          <TouchableOpacity onPress={() => setShowSettings(false)} style={styles.closeBtn}>
            <Text style={{ fontSize: 18, color: palette.textMuted }}>‹</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.headerDot, { backgroundColor: ctx.isConnected ? '#22c55e' : palette.textSubtle }]} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: palette.text, fontFamily: theme.fontFamily }]}>
            {showSettings ? 'Settings' : (chatSettings?.name ?? 'Support')}
          </Text>
          {!showSettings && (
            <Text style={[styles.headerSub, { color: palette.textMuted, fontFamily: theme.fontFamily }]}>
              {ctx.onlineAgents > 0 ? `${ctx.onlineAgents} agent${ctx.onlineAgents > 1 ? 's' : ''} online` : 'We\'ll reply soon'}
            </Text>
          )}
        </View>
        {!showSettings && (chatSettings?.layout !== 'single' || chatSettings?.showMenu) && (
          <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.closeBtn}>
            <Text style={{ fontSize: 18, color: palette.textMuted }}>⚙</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={{ fontSize: 20, color: palette.textMuted }}>✕</Text>
        </TouchableOpacity>
      </View>

      {showSettings ? (
        <SettingsScreen theme={theme} palette={palette} />
      ) : (
      <>
      {showOffline && (
        <View style={styles.offlineBanner} accessibilityRole="alert">
          <Text style={[styles.offlineBannerText, { fontFamily: theme.fontFamily }]}>
            Can't reach chat right now — reconnecting…
          </Text>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {ctx.messages.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            <Text style={{ fontSize: 28, marginBottom: 12 }}>👋</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: palette.text, textAlign: 'center', fontFamily: theme.fontFamily }}>
              {personalize(chatSettings?.welcomeMessage ?? 'Hi there! How can we help you today?', ctx.visitorName)}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={ctx.messages}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingVertical: 12 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {showPreChatForm && (
          <PreChatForm
            fields={preChatFields}
            title={isOfflineNoBot ? "We're offline right now" : 'Before we start'}
            subtitle={isOfflineNoBot ? "Leave your details and we'll get back to you" : 'Share your details so we can follow up'}
            submitLabel={isOfflineNoBot ? 'Send' : 'Start chat'}
            requireContact={preChatFields === DEFAULT_PRE_CHAT_FIELDS}
            initial={{ name: ctx.currentUser?.name ?? '', email: ctx.currentUser?.email ?? '' }}
            theme={theme}
            palette={palette}
            onSubmit={submitPreChat}
          />
        )}

        {ctx.isTyping && chatSettings?.typingIndicator !== false && (
          ctx.isAiTyping
            ? <AiOrb colors={gradientColors(theme)} color={theme.primaryColor ?? palette.accent} textColor={palette.textMuted} />
            : <TypingIndicator color={palette.accent} backgroundColor={palette.agentBubble} />
        )}

        {attachmentError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{attachmentError}</Text>
            <TouchableOpacity onPress={dismissAttachmentError} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.errorBannerDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <KerModal
          visible={showAttachChooser}
          title="Send attachment"
          onClose={() => setShowAttachChooser(false)}
          theme={theme}
          palette={palette}
        >
          <TouchableOpacity style={[styles.attachChoice, { borderColor: palette.border }]} onPress={() => pickAttachment('photo')}>
            <Text style={[styles.attachChoiceText, { color: palette.text, fontFamily: theme.fontFamily }]}>Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.attachChoice, { borderColor: palette.border }]} onPress={() => pickAttachment('document')}>
            <Text style={[styles.attachChoiceText, { color: palette.text, fontFamily: theme.fontFamily }]}>Document</Text>
          </TouchableOpacity>
        </KerModal>

        <InputBar
          value={text}
          onChangeText={handleChangeText}
          onSend={handleSend}
          onAttach={handleAttach}
          isUploading={isUploading}
          pendingAttachment={pendingAttachment}
          onRemoveAttachment={removeAttachment}
          theme={theme}
          disabled={!ctx.isConnected}
          placeholder={!ctx.isConnected ? 'Waiting for connection…' : undefined}
        />
        {/* Same credit the web widget shows; hidden only when the org is entitled
            to remove branding (resolved server-side into showBranding). */}
        {chatSettings?.showBranding !== false && (
          <TouchableOpacity onPress={() => Linking.openURL('https://kerabie.com/?utm_source=widget&utm_medium=powered_by')} style={styles.branding}>
            <Text style={[styles.brandingText, { color: palette.textSubtle }]}>
              Powered by <Text style={{ fontWeight: '600', color: palette.textMuted }}>Kerabie</Text>
            </Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
      </>
      )}

      <ImageViewerModal uri={viewingImageUri} onClose={() => setViewingImageUri(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  offlineBanner: { backgroundColor: '#d97706', paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center' },
  offlineBannerText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  headerDot: { width: 9, height: 9, borderRadius: 5 },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  headerSub: { fontSize: 12, marginTop: 1 },
  branding: { alignItems: 'center', paddingVertical: 6 },
  brandingText: { fontSize: 11 },
  attachChoice: { alignItems: 'center', paddingVertical: 12, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  attachChoiceText: { fontSize: 14, fontWeight: '600' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#fecaca',
  },
  errorBannerText: { flex: 1, fontSize: 12.5, color: '#b91c1c', lineHeight: 17 },
  errorBannerDismiss: { fontSize: 12, color: '#b91c1c', opacity: 0.7 },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
