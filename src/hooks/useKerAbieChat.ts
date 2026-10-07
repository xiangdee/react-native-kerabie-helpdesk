import { useKerAbieContext } from '../provider/KerAbieContext';

export function useKerAbieChat() {
  const ctx = useKerAbieContext();
  return {
    isOpen: ctx.isOpen,
    open: ctx.open,
    close: ctx.close,
    toggle: ctx.toggle,
    unreadCount: ctx.unreadCount,
    conversations: ctx.conversations,
    currentConversation: ctx.currentConversation,
    messages: ctx.messages,
    sendMessage: ctx.sendMessage,
    isTyping: ctx.isTyping,
    onlineAgents: ctx.onlineAgents,
    isConnected: ctx.isConnected,
  };
}
