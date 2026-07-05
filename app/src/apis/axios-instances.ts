// apis/axios.ts
import axios from "axios";
import { AI_SERVER_URL } from "@/config";
import { clearStoredAiServerToken, getAiServerToken } from "@/lib/ai-server-token";

const axiosInstance = axios.create({
  baseURL: "",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // useful for cookies / auth
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = "/signin";
    }
    return Promise.reject(error);
  }
);

const aiServerAxiosInstance = axios.create({
  baseURL: AI_SERVER_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ai-server authenticates only via a short-lived bearer token (issued by
// api-server after validating the candidate's Supabase session, cached in
// sessionStorage) — never cookies, so every request picks up a valid one here.
aiServerAxiosInstance.interceptors.request.use(async (config) => {
  const token = await getAiServerToken();
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

aiServerAxiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // A 401 here means the cached token expired or was rejected. Fetch a
    // fresh one and retry exactly once before giving up and redirecting.
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const token = await getAiServerToken(true);
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return aiServerAxiosInstance(originalRequest);
      } catch {
        clearStoredAiServerToken();
        window.location.href = "/signin";
      }
    }

    return Promise.reject(error);
  }
);

export { axiosInstance, aiServerAxiosInstance };
