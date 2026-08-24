import { User } from "../auth/types";

export interface ConversationMember {
  id: string;
  userId: string;
  user: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  name?: string;
  members: ConversationMember[];
  messages: Message[]; // last message preview only, from the list endpoint
  updatedAt: string;
  isUnread: boolean;
}
