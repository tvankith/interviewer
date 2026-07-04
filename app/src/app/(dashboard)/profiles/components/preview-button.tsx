"use client";

import { useRouter } from "next/navigation";

export default function PreviewButton({ id }: { id: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/profiles/${id}/edit/preview`)}
      className="px-4 py-2 bg-black text-white rounded-md"
    >
      Preview Resume
    </button>
  );
}