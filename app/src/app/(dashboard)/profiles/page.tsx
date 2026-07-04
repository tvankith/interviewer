"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchProfiles, createCandidateApi } from "@/apis/profile";
import ProfileItem from "./profile/compose/profile-item";
import List from "@/components/basic/list";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function ProfilesPage() {
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ["profiles"],
    queryFn: fetchProfiles,
  });

  const createMutation = useMutation({
    mutationFn: () => createCandidateApi({}),
    onSuccess: (data) => {
      router.push(`/profiles/${data.id}/edit`);
    },
  });

  if (isLoading) return <div className="p-6">Loading profiles...</div>;
  if (error) return <div className="p-6 text-red-500">Failed to load profiles</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Profiles</h1>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? "Creating..." : "Add Profile"}
        </Button>
      </div>

      <List
        data={data || []}
        renderItem={(profile) => (
          <ProfileItem key={profile.id} profile={profile} />
        )}
        emptyState={<div>No profiles found</div>}
      />
    </div>
  );
}