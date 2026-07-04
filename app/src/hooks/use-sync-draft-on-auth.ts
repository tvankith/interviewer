import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { getFromDB, deleteFromDB } from "@/lib/indexdb";
import { createCandidateApi } from "@/apis/profile";
import { mapFormToProfilePayload } from "@/app/(dashboard)/profiles/helpers/map-form-to-profile-payload";

const PROFILE_DRAFT_KEY = "profileDraft";

export function useSyncDraftOnAuth() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth({ enabled: false });
  const syncAttempted = useRef(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (syncAttempted.current) return;

    syncAttempted.current = true;

    const syncDraft = async () => {
      try {
        const draft = await getFromDB(PROFILE_DRAFT_KEY);

        if (!draft) return;
        console.log("draft: ", draft)
        const payload = mapFormToProfilePayload(draft);
        const result = await createCandidateApi(payload);
        await deleteFromDB(PROFILE_DRAFT_KEY);

        router.push(`/profiles/${result.id}/edit`);
      } catch (error) {
        console.error("Failed to sync draft after authentication:", error);
      }
    };

    syncDraft();
  }, [isAuthenticated, isLoading, router]);
}
