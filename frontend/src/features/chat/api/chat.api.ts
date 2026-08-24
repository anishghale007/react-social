import axiosInstance from "../../../services/api/axiosInstance";
import { Conversation, Message } from "../types";

export const chatApi = {
  getConversations: async (): Promise<Conversation[]> => {
    const { data } = await axiosInstance.get("/chat/conversations");
    return data;
  },
  createConversation: async (recipientId: string): Promise<Conversation> => {
    const { data } = await axiosInstance.post("/chat/conversations", {
      recipientId,
    });
    return data;
  },
  getMessages: async (conversationId: string, page = 1) => {
    const { data } = await axiosInstance.get(
      `/chat/conversations/${conversationId}/messages`,
      { params: { page, limit: 30 } },
    );
    return data as { data: Message[]; meta: any };
  },
  markAsRead: async (conversationId: string): Promise<{ success: boolean }> => {
    const { data } = await axiosInstance.post(
      `/chat/conversations/${conversationId}/read`,
    );
    return data;
  },
};
