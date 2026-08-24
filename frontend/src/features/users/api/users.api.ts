import axiosInstance from "../../../services/api/axiosInstance";
import { User } from "../../auth/types";
import { FollowUser, PublicProfile, UpdateProfilePayload } from "../types";

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const { data } = await axiosInstance.get("/users");
    return data;
  },
  getProfile: async (userId: string): Promise<PublicProfile> => {
    const { data } = await axiosInstance.get(`/users/${userId}`);
    return data;
  },
  updateProfile: async (payload: UpdateProfilePayload): Promise<User> => {
    const { data } = await axiosInstance.patch("/users/me", payload);
    return data;
  },
  search: async (q: string): Promise<User[]> => {
    const { data } = await axiosInstance.get("/users/search", {
      params: { q },
    });
    return data;
  },
  follow: async (userId: string): Promise<{ following: boolean }> => {
    const { data } = await axiosInstance.post(`/users/${userId}/follow`);
    return data;
  },
  unfollow: async (userId: string): Promise<{ following: boolean }> => {
    const { data } = await axiosInstance.delete(`/users/${userId}/follow`);
    return data;
  },
  getFollowers: async (userId: string): Promise<FollowUser[]> => {
    const { data } = await axiosInstance.get(`/users/${userId}/followers`);
    return data;
  },
  getFollowing: async (userId: string): Promise<FollowUser[]> => {
    const { data } = await axiosInstance.get(`/users/${userId}/following`);
    return data;
  },
};
