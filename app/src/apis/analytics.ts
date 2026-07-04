import { axiosInstance } from "./axios-instances";

export interface ModelUsageRecord {
    id: string;
    user_id: string | null;
    run_id: string | null;
    step_id: string | null;
    model_id: string;
    provider: string;
    operation: string;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    latency_ms: number | null;
    cost_usd: number | null;
    created_at: string;
}

export interface ModelUsageSummary {
    totals: {
        calls: number;
        input_tokens: number;
        output_tokens: number;
        total_tokens: number;
        cost_usd: number;
        avg_latency_ms: number;
    };
    by_operation: { operation: string; calls: number; tokens: number; cost_usd: number }[];
    by_model: { provider: string; model_id: string; calls: number; tokens: number; cost_usd: number }[];
}

export interface AnalyticsEventRecord {
    id: string;
    user_id: string | null;
    event_type: string;
    entity_type: string | null;
    entity_id: string | null;
    run_id: string | null;
    properties: Record<string, unknown> | null;
    created_at: string;
}

export interface EventsSummary {
    total: number;
    by_event_type: { event_type: string; count: number }[];
}

export async function fetchModelUsageSummary(): Promise<ModelUsageSummary> {
    const res = await axiosInstance.get("/api/analytics/model-usage/summary");
    return res.data;
}

export async function fetchModelUsage(params?: {
    operation?: string;
    model_id?: string;
    provider?: string;
    limit?: number;
    offset?: number;
}): Promise<ModelUsageRecord[]> {
    const res = await axiosInstance.get("/api/analytics/model-usage", { params });
    return res.data;
}

export async function fetchEventsSummary(): Promise<EventsSummary> {
    const res = await axiosInstance.get("/api/analytics/events/summary");
    return res.data;
}

export async function fetchEvents(params?: {
    event_type?: string;
    entity_type?: string;
    limit?: number;
    offset?: number;
}): Promise<AnalyticsEventRecord[]> {
    const res = await axiosInstance.get("/api/analytics/events", { params });
    return res.data;
}
