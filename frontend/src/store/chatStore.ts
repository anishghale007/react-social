import { create } from "zustand";
import { Socket } from "socket.io-client";
import {
  connectSocket,
  disconnectSocket,
} from "../services/socket/socketClient";
import { chatApi } from "../features/chat/api/chat.api";
import { Conversation, Message } from "../features/chat/types";

interface ChatState {
  socket: Socket | null;
  conversations: Conversation[];
  activeConversationId: string | null;
  activeMessages: Message[];
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  fetchConversations: () => Promise<void>;
  startConversation: (recipientId: string) => Promise<Conversation>;
  joinConversation: (conversationId: string) => void;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => void;
  markAsRead: (conversationId: string) => Promise<void>;
  unreadCount: () => number;
}

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  conversations: [],
  activeConversationId: null,
  activeMessages: [],
  isConnected: false,

  connect: async () => {
    if (get().socket?.connected) return;
    const socket = await connectSocket();

    socket.on("newMessage", (message: Message) => {
      set((state) => {
        const isActiveConversation =
          state.activeConversationId === message.conversationId;

        return {
          activeMessages: isActiveConversation
            ? [...state.activeMessages, message]
            : state.activeMessages,
          conversations: state.conversations.map((c) =>
            c.id === message.conversationId
              ? {
                  ...c,
                  messages: [message],
                  updatedAt: message.createdAt,
                  // If this conversation is currently open, treat new messages as read immediately
                  isUnread: isActiveConversation ? false : true,
                }
              : c,
          ),
        };
      });

      // If the conversation is actively open, tell the backend it's read right away
      const state = get();
      if (state.activeConversationId === message.conversationId) {
        state.markAsRead(message.conversationId);
      }
    });

    set({ socket, isConnected: true });
  },

  disconnect: () => {
    disconnectSocket();
    set({ socket: null, isConnected: false });
  },

  fetchConversations: async () => {
    const conversations = await chatApi.getConversations();
    set({ conversations });
  },

  startConversation: async (recipientId: string) => {
    const conversation = await chatApi.createConversation(recipientId);
    set((state) => {
      const exists = state.conversations.some((c) => c.id === conversation.id);
      return exists
        ? state
        : { conversations: [conversation, ...state.conversations] };
    });
    return conversation;
  },

  joinConversation: (conversationId: string) => {
    set({ activeConversationId: conversationId });
    get().socket?.emit("joinConversation", conversationId);
  },

  fetchMessages: async (conversationId: string) => {
    const res = await chatApi.getMessages(conversationId);
    set({ activeMessages: res.data });
  },

  sendMessage: (conversationId: string, content: string) => {
    get().socket?.emit("sendMessage", { conversationId, content });
  },

  markAsRead: async (conversationId: string) => {
    try {
      await chatApi.markAsRead(conversationId);
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, isUnread: false } : c,
        ),
      }));
    } catch {
      // non-critical — silently ignore, badge just won't clear until next fetch
    }
  },

  unreadCount: () => get().conversations.filter((c) => c.isUnread).length,
}));
