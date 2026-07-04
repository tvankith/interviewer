"use server";

import axios from "axios";
import { cookies } from "next/headers";

const serverApi = axios.create({
    baseURL: process.env.API_SERVER_URL,
});

serverApi.interceptors.request.use(async (config: any) => {
    const cookieStore = await cookies();

    const token = cookieStore.get("access_token")?.value;

    config.headers = {
        ...config.headers,
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
    };

    return config;
});

export default serverApi;
