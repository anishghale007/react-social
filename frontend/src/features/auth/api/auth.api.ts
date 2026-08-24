import axiosInstance from "@/services/api/axiosInstance";
import { RegisterPayload, AuthResponse, LoginPayload, User } from "../types";

export const authApi = {
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const { data } = await axiosInstance.post("/auth/register", payload);
    return data;
  },
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await axiosInstance.post("/auth/login", payload);
    return data;
  },
  logout: async (refreshToken: string) => {
    const { data } = await axiosInstance.post("/auth/logout", { refreshToken });
    return data;
  },
  getMe: async (): Promise<User> => {
    const { data } = await axiosInstance.get("/users/me");
    return data;
  },
};
