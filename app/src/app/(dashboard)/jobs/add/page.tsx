'use client';

import { useMutation } from "@tanstack/react-query";
import { createJobApi } from "@/apis/job";
import { useRouter } from "next/navigation";
import JobForm from "../job-form";

const CreateJobPage = () => {
  const router = useRouter();

  const createJob = useMutation({
    mutationFn: createJobApi,
    onSuccess: (data) => {

      // redirect to detail page (recommended)
      router.push(`/jobs/${data.id}`);
    },
    onError: (err) => {
      console.error("Create failed", err);
    },
  });

  return (
    <JobForm
      mode="create"
      onSubmit={(payload) => createJob.mutate(payload)}
      isLoading={createJob.isPending}
    />
  );
};

export default CreateJobPage;