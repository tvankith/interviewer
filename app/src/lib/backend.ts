"use server";

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

declare module "axios" {
    interface InternalAxiosRequestConfig {
        _retry?: boolean;
        _skipAuthOverride?: boolean;
    }
}

const BACKEND_URL = process.env.API_SERVER_URL;

function decodeToken(token: string): { exp?: number } | null {
    try {
        const payload = token.split(".")[1];
        if (!payload) return null;
        return JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
    } catch {
        return null;
    }
}

async function refreshAccessToken(refreshToken: string) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${refreshToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
            cache: "no-store",
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (!data.ok || !data.access_token) return null;

        return {
            accessToken: data.access_token as string,
            refreshToken: data.refresh_token as string | undefined,
        };
    } catch (error) {
        console.error("Refresh Error:", error);
        return null;
    }
}

const serverApi = axios.create({
    baseURL: BACKEND_URL,
});

serverApi.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    // Retries from the response interceptor already stamped a fresh token on
    // this config; don't clobber it with the (stale) cookie value again.
    if (config._skipAuthOverride) {
        return config;
    }

    const cookieStore = await cookies();

    const token = cookieStore.get("access_token")?.value;

    config.headers = {
        ...config.headers,
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
    } as InternalAxiosRequestConfig["headers"];

    return config;
});

serverApi.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config;

        if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
            return Promise.reject(error);
        }

        const cookieStore = await cookies();
        const refreshToken = cookieStore.get("refresh_token")?.value;

        if (!refreshToken) {
            redirect("/signin");
        }

        const refreshed = await refreshAccessToken(refreshToken);
        if (!refreshed) {
            // Refresh token was rejected (expired, rotated, or revoked) — the
            // session can't be recovered here, so send the user back to sign in
            // rather than surfacing a raw 401 as a Server Component render error.
            redirect("/signin");
        }

        // Persisting the rotated cookies back to the browser only works when this
        // module runs inside a Server Action/Route Handler, not a plain Server
        // Component render — best-effort, since the retried request succeeds either way.
        try {
            const decoded = decodeToken(refreshed.accessToken);
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax" as const,
                path: "/",
                domain: process.env.COOKIE_DOMAIN || undefined,
            };

            cookieStore.set("access_token", refreshed.accessToken, {
                ...cookieOptions,
                expires: decoded?.exp ? new Date(decoded.exp * 1000) : undefined,
            });

            if (refreshed.refreshToken) {
                cookieStore.set("refresh_token", refreshed.refreshToken, cookieOptions);
            }
        } catch {
            // Not allowed outside Server Action/Route Handler context; ignore.
        }

        originalRequest._retry = true;
        originalRequest._skipAuthOverride = true;
        originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${refreshed.accessToken}`,
        } as InternalAxiosRequestConfig["headers"];

        return serverApi(originalRequest);
    }
);

export default serverApi;
