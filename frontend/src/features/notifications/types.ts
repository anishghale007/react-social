import { User } from "../auth/types";

export type NotificationType = "LIKE" | "COMMENT" | "FOLLOW";

export interface Notification {
  id: string;
  type: NotificationType;
  isRead: boolean;
  actorId: string;
  actor: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
  postId?: string;
  post?: { id: string; content: string };
  createdAt: string;
}

export interface PaginatedNotifications {
  data: Notification[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    unreadCount: number;
  };
}
