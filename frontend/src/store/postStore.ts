import { postsApi } from "@/features/auth/posts/api/posts.api";
import { Post } from "@/features/auth/posts/types";
import { create } from "zustand";

interface PostsState {
  posts: Post[];
  page: number;
  totalPages: number;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  feedMode: "global" | "following";
  setFeedMode: (mode: "global" | "following") => void;
  fetchPosts: (page?: number) => Promise<void>;
  refreshPosts: () => Promise<void>;
  createPost: (content: string) => Promise<void>;
  updatePost: (id: string, content: string) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  incrementCommentCount: (postId: string) => void;
  decrementCommentCount: (postId: string) => void;
}
export const usePostsStore = create<PostsState>((set, get) => ({
  posts: [],
  page: 1,
  totalPages: 1,
  isLoading: false,
  isRefreshing: false,
  error: null,
  feedMode: "global",

  setFeedMode: (mode) => {
    set({ feedMode: mode, posts: [], page: 1 });
    get().fetchPosts(1);
  },

  fetchPosts: async (page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const res =
        get().feedMode === "following"
          ? await postsApi.getFollowingFeed(page, 10)
          : await postsApi.getAll(page, 10);
      set((state) => ({
        posts: page === 1 ? res.data : [...state.posts, ...res.data],
        page: res.meta.page,
        totalPages: res.meta.totalPages,
        isLoading: false,
      }));
    } catch (err: any) {
      set({
        error: err.response?.data?.message ?? "Failed to load posts",
        isLoading: false,
      });
    }
  },

  refreshPosts: async () => {
    set({ isRefreshing: true });
    try {
      const res =
        get().feedMode === "following"
          ? await postsApi.getFollowingFeed(1, 10)
          : await postsApi.getAll(1, 10);
      set({
        posts: res.data,
        page: 1,
        totalPages: res.meta.totalPages,
        isRefreshing: false,
      });
    } catch {
      set({ isRefreshing: false });
    }
  },

  createPost: async (content: string) => {
    const newPost = await postsApi.create({ content });
    set((state) => ({ posts: [newPost, ...state.posts] }));
  },

  updatePost: async (id: string, content: string) => {
    const updated = await postsApi.update(id, { content });
    set((state) => ({
      posts: state.posts.map((p) => (p.id === id ? updated : p)),
    }));
  },

  deletePost: async (id: string) => {
    await postsApi.delete(id);
    set((state) => ({ posts: state.posts.filter((p) => p.id !== id) }));
  },

  incrementCommentCount: (postId: string) => {
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? { ...p, _count: { ...p._count, comments: p._count.comments + 1 } }
          : p,
      ),
    }));
  },

  decrementCommentCount: (postId: string) => {
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              _count: {
                ...p._count,
                comments: Math.max(0, p._count.comments - 1),
              },
            }
          : p,
      ),
    }));
  },
}));
