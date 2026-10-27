import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { useKerAbieContext } from '../provider/KerAbieContext';
import type { KerChatSettings, KerTheme } from '../types';
import { usePalette } from '../theme/palette';
import { ChatScreen } from './ChatScreen';
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
 * the same structure as the web widget. The single layout is one continuous chat, so it opens straight
 * on Chat and only shows the tabs when the dashboard's "Show navigation" is on.
 */
export function WidgetShell({ onClose, theme, chatSettings }: Props) {
  const ctx = useKerAbieContext();
  const palette = usePalette(theme);
  const single = chatSettings?.layout === 'single';
  const showTabs = !single || !!chatSettings?.showNavigation;
  const [tab, setTab] = useState<WidgetTab>(single || ctx.chatDraft ? 'chat' : 'home');

  // A search-bar draft or an opened conversation (push tap, deep link) goes straight to the chat.
  useEffect(() => {
    if (ctx.chatDraft) setTab('chat');
  }, [ctx.chatDraft]);

  const tickets = ctx.config.ticketsEnabled;
  const activeTab = tab === 'tickets' && !tickets ? 'home' : tab;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: palette.background }]}>
      <View style={{ flex: 1 }}>
        {activeTab === 'home' && <HomeScreen theme={theme} palette={palette} chatSettings={chatSettings} onClose={onClose} onChat={() => setTab('chat')} />}
        {activeTab === 'chat' && (
          <ChatScreen onClose={onClose} theme={theme} chatSettings={chatSettings} onBack={showTabs ? () => setTab('home') : undefined} />
        )}
        {activeTab === 'help' && <HelpScreen theme={theme} palette={palette} />}
        {activeTab === 'tickets' && <TicketsScreen onClose={() => setTab('home')} theme={theme} />}
      </View>
      {showTabs && activeTab !== 'chat' && (
        <TabBar active={activeTab} ticketsEnabled={tickets} unread={ctx.unreadCount} onChange={setTab} palette={palette} fontFamily={theme.fontFamily} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
