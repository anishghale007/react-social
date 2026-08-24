import { create } from "zustand";
import { usersApi } from "../features/users/api/users.api";
import { User } from "../features/auth/types";
import { PublicProfile, UpdateProfilePayload } from "../features/users/types";

interface ProfileState {
  viewedProfile: PublicProfile | null;
  isLoadingProfile: boolean;
  updateProfile: (payload: UpdateProfilePayload) => Promise<User>;
  fetchProfile: (userId: string) => Promise<void>;
  clearViewedProfile: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  viewedProfile: null,
  isLoadingProfile: false,

  updateProfile: async (payload) => {
    const updated = await usersApi.updateProfile(payload);
    return updated;
  },

  fetchProfile: async (userId: string) => {
    set({ isLoadingProfile: true });
    try {
      const profile = await usersApi.getProfile(userId);
      set({ viewedProfile: profile, isLoadingProfile: false });
    } catch (err) {
      set({ isLoadingProfile: false });
      throw err;
    }
  },

  clearViewedProfile: () => set({ viewedProfile: null }),
}));
