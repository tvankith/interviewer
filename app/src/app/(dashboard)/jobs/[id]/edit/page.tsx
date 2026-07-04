'use client';

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import JobForm from "../../job-form";
import { getJobById, updateJob } from "@/apis/job";

const EditJobPage = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  /** 🔹 fetch existing job */
  const { data, isLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: () => getJobById(id),
    enabled: !!id,
  });

  /** 🔹 update mutation */
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: any) => updateJob(id, payload),

    onSuccess: () => {
      // invalidate cache
      queryClient.invalidateQueries({ queryKey: ["job", id] });

      // redirect or toast
      router.push("/jobs");
    },
  });

  if (isLoading) {
    return <div className="p-6">Loading job...</div>;
  }

  if (!data) {
    return <div className="p-6">Job not found</div>;
  }

  return (
    <JobForm
      mode="edit"
      initialData={data}
      onSubmit={async (payload) => {
        await mutateAsync(payload);
      }}
    />
  );
};

export default EditJobPage;