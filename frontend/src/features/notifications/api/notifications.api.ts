import axiosInstance from "../../../services/api/axiosInstance";
import { PaginatedNotifications } from "../types";

export const notificationsApi = {
  getAll: async (page = 1): Promise<PaginatedNotifications> => {
    const { data } = await axiosInstance.get("/notifications", {
      params: { page, limit: 20 },
    });
    return data;
  },
  getUnreadCount: async (): Promise<{ count: number }> => {
    const { data } = await axiosInstance.get("/notifications/unread-count");
    return data;
  },
  markAllAsRead: async (): Promise<{ success: boolean }> => {
    const { data } = await axiosInstance.post("/notifications/mark-all-read");
    return data;
  },
};
