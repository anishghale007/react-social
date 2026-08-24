import { User } from "../types";

export interface Post {
  id: string;
  content: string;
  authorId: string;
  author: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
  createdAt: string;
  updatedAt: string;
  _count: {
    likes: number;
    comments: number;
  };
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
  content: string;
  createdAt: string;
}

export interface PaginatedComments {
  data: Comment[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface LikeStatus {
  count: number;
  likedByMe: boolean;
}

export interface PaginatedPosts {
  data: Post[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreatePostPayload {
  content: string;
}

export interface UpdatePostPayload {
  content: string;
}
