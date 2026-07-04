import { axiosInstance } from "./axios-instances";

export interface AuthUser {
  id: string;
  email: string;
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await axiosInstance.get<AuthUser>("/api/auth/me");
  return data;
}

export async function logout(): Promise<void> {
  await axiosInstance.post("/api/auth/logout");
}
