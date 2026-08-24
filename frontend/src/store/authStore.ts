import { create } from "zustand";
import { tokenStorage } from "../services/api/tokenStorage";
import { authApi } from "../features/auth/api/auth.api";
import { User, LoginPayload, RegisterPayload } from "../features/auth/types";
import { useChatStore } from "./chatStore";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isHydrated: false,
  error: null,

  // Called once on app launch — checks if a token already exists
  hydrate: async () => {
    const token = await tokenStorage.getAccessToken();
    console.log("Access token: ", token);
    if (!token) {
      set({ isHydrated: true, user: null });
      return;
    }
    try {
      const user = await authApi.getMe();
      console.log("User: ", user);
      set({ isHydrated: true, user });
    } catch {
      // token invalid/expired and refresh also failed — clear everything
      await tokenStorage.clearTokens();
      set({ isHydrated: true, user: null });
    }
  },

  login: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login(payload);
      console.log("LOGIN RESPONSE:", JSON.stringify(res));
      await tokenStorage.setTokens(res.accessToken, res.refreshToken);

      const verify = await tokenStorage.getAccessToken();
      set({ user: res.user, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.message ?? "Login failed",
        isLoading: false,
      });
      throw err;
    }
  },

  register: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.register(payload);
      await tokenStorage.setTokens(res.accessToken, res.refreshToken);
      set({ user: res.user, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.message ?? "Registration failed",
        isLoading: false,
      });
      throw err;
    }
  },

  logout: async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // ignore network errors on logout — clear local state regardless
      }
    }
    await tokenStorage.clearTokens();
    await tokenStorage.clearTokens();
    useChatStore.getState().disconnect(); // tear down the socket tied to the old session
    useChatStore.setState({
      conversations: [],
      activeMessages: [],
      activeConversationId: null,
    });
    set({ user: null });
  },
  // Lets other stores (e.g. profileStore after an edit) sync the session-wide user object
  setUser: (user: User) => set({ user }),
}));
