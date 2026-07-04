"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { deleteProfile, Profile } from "@/apis/profile";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function ProfileItem({ profile }: { profile: Profile }) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { mutateAsync, isPending } = useMutation({
        mutationFn: ()=> deleteProfile(profile.id),

        onSuccess: () => {
            // 🔄 Option 1: invalidate list query
            queryClient.invalidateQueries({ queryKey: ["profiles"] });

            // 🔄 Option 2 (optional): refresh route
            router.refresh();
        },

        onError: (error) => {
            console.error(error);
            alert("Error deleting profile");
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
        <Link href={`/profiles/${profile.id}/edit`}>
            <Card className="hover:shadow-md transition cursor-pointer flex flex-col justify-between h-full">
                <CardHeader>
                    <CardTitle>
                        {profile.name || "Candidate"}
                    </CardTitle>

                    <p className="text-sm text-muted-foreground">
                        {profile.experiences?.[0]?.role || "No role added"}
                        {profile.experiences?.[0]?.company &&
                            ` @ ${profile.experiences[0].company}`}
                    </p>
                </CardHeader>

                <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                        {profile.email || "No email added"}
                    </div>
                </CardContent>

                <CardFooter className="flex justify-end">
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                    >
                        Delete
                    </Button>
                </CardFooter>
            </Card>
        </Link>
    );
}