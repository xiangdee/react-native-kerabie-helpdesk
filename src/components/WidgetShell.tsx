import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { useKerAbieContext } from '../provider/KerAbieContext';
import type { KerChatSettings, KerTheme } from '../types';
import { usePalette } from '../theme/palette';
import { ChatScreen } from './ChatScreen';
import { ConversationsScreen } from './ConversationsScreen';
import { HomeScreen } from './HomeScreen';
import { HelpScreen } from './HelpScreen';
import { TicketsScreen } from './TicketsScreen';
import { TabBar, WidgetTab } from './TabBar';

interface Props {
  onClose: () => void;
  theme: KerTheme;
  chatSettings?: KerChatSettings;
}

/**
 * The whole widget: Home, Chat, Help and (when the org has them on) Tickets behind a bottom tab bar —
 * the same structure as the web widget. The full layout's Chat tab is the conversation list (with New chat);
 * the single layout is one continuous chat, so it opens straight on it and only shows the tabs when the
 * dashboard's "Show navigation" is on.
 */
export function WidgetShell({ onClose, theme, chatSettings }: Props) {
  const ctx = useKerAbieContext();
  const palette = usePalette(theme);
  const single = chatSettings?.layout === 'single';
  const showTabs = !single || !!chatSettings?.showNavigation;
  const [tab, setTab] = useState<WidgetTab>(single || ctx.chatDraft ? 'chat' : 'home');
  // Inside the Chat tab of the full layout: the list of chats, or one open chat.
  const [chatOpen, setChatOpen] = useState(single || !!ctx.chatDraft);

  // A search-bar draft goes straight to a chat.
  useEffect(() => {
    if (ctx.chatDraft) { setTab('chat'); setChatOpen(true); }
  }, [ctx.chatDraft]);

  const tickets = ctx.config.ticketsEnabled;
  const activeTab = tab === 'tickets' && !tickets ? 'home' : tab;
  const inChat = activeTab === 'chat' && chatOpen;

  const changeTab = (next: WidgetTab) => {
    setTab(next);
    if (next === 'chat') setChatOpen(single); // the full layout lands on the list
  };

  // "Ask our AI" / "Chat with us" on Home: a fresh chat (the single layout has just the one).
  const startChat = () => {
    if (!single) ctx.startNewConversation();
    setTab('chat');
    setChatOpen(true);
  };

  const newChat = () => {
    ctx.startNewConversation();
    setChatOpen(true);
  };

  const openChat = (id: number) => {
    setChatOpen(true);
    void ctx.openConversation(id);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: palette.background }]}>
      <View style={{ flex: 1 }}>
        {activeTab === 'home' && <HomeScreen theme={theme} palette={palette} chatSettings={chatSettings} onClose={onClose} onChat={startChat} />}
        {activeTab === 'chat' && !inChat && (
          <ConversationsScreen theme={theme} palette={palette} chatSettings={chatSettings} onOpen={openChat} onNew={newChat} />
        )}
        {inChat && (
          <ChatScreen
            onClose={onClose}
            theme={theme}
            chatSettings={chatSettings}
            onBack={showTabs ? () => (single ? setTab('home') : setChatOpen(false)) : undefined}
          />
        )}
        {activeTab === 'help' && <HelpScreen theme={theme} palette={palette} />}
        {activeTab === 'tickets' && <TicketsScreen onClose={() => setTab('home')} theme={theme} />}
      </View>
      {showTabs && !inChat && (
        <TabBar active={activeTab} ticketsEnabled={tickets} unread={ctx.unreadCount} onChange={changeTab} palette={palette} fontFamily={theme.fontFamily} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
