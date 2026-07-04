"use client"

import { fetchJobs } from "@/apis/job";
import JobItem from "@/app/(dashboard)/jobs/job-item";
import List from "@/components/basic/list";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export default function JobsPage() {
    const router = useRouter();

    const { data, isLoading, error } = useQuery({
        queryKey: ["jobs"],
        queryFn: fetchJobs,
    });
    if (isLoading) {
        return <div className="p-6">Loading jobs...</div>;
    }

    if (error) {
        return <div className="p-6 text-red-500">Failed to load jobs</div>;
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">Jobs</h1>
                <Button onClick={() => router.push("/jobs/add")}>Add Job</Button>
            </div>

            <List
                data={data || []}
                renderItem={(job) => <JobItem key={job.id} job={job} />}
                emptyState={<div>No jobs found</div>}
            />
        </div>
    );
}