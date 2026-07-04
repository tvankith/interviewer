"use client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteJob } from "@/apis/job";

type Job = {
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

export default function JobItem({ job }: { job: Job }) {
  const queryClient = useQueryClient();
  const skills = [
    ...(job.primary_skills_by_category.backend || []),
    ...(job.primary_skills_by_category.frontend || []),
  ].slice(0, 4);

  /** 🔹 Delete mutation */
  const { mutateAsync, isPending } = useMutation({
    mutationFn: () => deleteJob(job.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
  });

  /** 🔹 Handle delete */
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = confirm("Are you sure you want to delete this profile?");
    if (!confirmed) return;

    await mutateAsync();
  };

  return (
    <Link href={`/jobs/${job.id}/edit`}>
      <Card className="hover:shadow-md transition cursor-pointer">
        <CardHeader>
          <CardTitle className="text-lg">{job.role}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {job.company || "Unknown Company"}
          </p>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            {job.experience_level}
          </div>

          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        </CardContent>

        {/* 🔻 Footer */}
        <CardFooter className="flex justify-end">
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-xs text-red-500 hover:text-red-700"
          >
            {isPending ? "Deleting..." : "Delete"}
          </button>
        </CardFooter>
      </Card>
    </Link>
  );
}