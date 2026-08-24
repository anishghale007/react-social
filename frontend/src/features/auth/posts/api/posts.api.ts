import axiosInstance from "@/services/api/axiosInstance";
import {
  Post,
  PaginatedPosts,
  CreatePostPayload,
  UpdatePostPayload,
  LikeStatus,
  PaginatedComments,
  Comment,
} from "../types";

export const postsApi = {
  getAll: async (page = 1, limit = 10): Promise<PaginatedPosts> => {
    const { data } = await axiosInstance.get("/posts", {
      params: { page, limit },
    });
    return data;
  },
  getOne: async (id: string): Promise<Post> => {
    const { data } = await axiosInstance.get(`/posts/${id}`);
    return data;
  },
  create: async (payload: CreatePostPayload): Promise<Post> => {
    const { data } = await axiosInstance.post("/posts", payload);
    return data;
  },
  update: async (id: string, payload: UpdatePostPayload): Promise<Post> => {
    const { data } = await axiosInstance.patch(`/posts/${id}`, payload);
    return data;
  },
  delete: async (id: string): Promise<{ success: boolean }> => {
    const { data } = await axiosInstance.delete(`/posts/${id}`);
    return data;
  },
  getByUser: async (
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedPosts> => {
    const { data } = await axiosInstance.get(`/posts/user/${userId}`, {
      params: { page, limit },
    });
    return data;
  },
  toggleLike: async (postId: string): Promise<{ liked: boolean }> => {
    const { data } = await axiosInstance.post(`/posts/${postId}/like`);
    return data;
  },
  getLikeStatus: async (postId: string): Promise<LikeStatus> => {
    const { data } = await axiosInstance.get(`/posts/${postId}/like-status`);
    return data;
  },
  getComments: async (postId: string, page = 1): Promise<PaginatedComments> => {
    const { data } = await axiosInstance.get(`/posts/${postId}/comments`, {
      params: { page, limit: 20 },
    });
    return data;
  },
  createComment: async (postId: string, content: string): Promise<Comment> => {
    const { data } = await axiosInstance.post(`/posts/${postId}/comments`, {
      content,
    });
    return data;
  },
  deleteComment: async (commentId: string): Promise<{ success: boolean }> => {
    const { data } = await axiosInstance.delete(`/posts/comments/${commentId}`);
    return data;
  },
  search: async (q: string, page = 1): Promise<PaginatedPosts> => {
    const { data } = await axiosInstance.get("/posts/search", {
      params: { q, page, limit: 10 },
    });
    return data;
  },
  getFollowingFeed: async (page = 1, limit = 10): Promise<PaginatedPosts> => {
    const { data } = await axiosInstance.get("/posts/feed/following", {
      params: { page, limit },
    });
    return data;
  },
};
