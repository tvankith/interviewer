import { axiosInstance } from "./axios-instances";

export const parseJD = async (data: { jd_text: string }) => {
    const res = await fetch(`/api/job/parse`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error("Failed to create interview");
    return res.json();
};

// apis/job.ts

export const createJobApi = async (payload: any) => {
    const { data } = await axiosInstance.post(`/api/job`, payload);
    return data;
};

export type Job = {
    id: string;
    company?: string;
    role: string;
    experience_level: string;
    created_at: string;
    primary_skills_by_category: {
        backend: string[];
        frontend?: string[];
        cloud?: string[];
        database?: string[];
        devops?: string[];
        misc?: string[];
    };
};

export async function fetchJobs(): Promise<Job[]> {
    const response = await axiosInstance(
        `/api/me/jobs`
    );
    return response.data
}

export const getJobById = async (jobId: string) => {
    const { data } = await axiosInstance.get(`/api/job/${jobId}`);
    return data;
};

export const updateJob = async (id: string, payload: any) => {
    const { data } = await axiosInstance.patch(`/api/job/${id}`, payload);
    return data;
};

export const deleteJob = async (id: string) => {
    const { data } = await axiosInstance.delete(`/api/job/${id}`);
    return data;
  };