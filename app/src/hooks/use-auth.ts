import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getMe, logout, type AuthUser } from "@/apis/auth";

export const AUTH_QUERY_KEY = ["auth", "me"];

export function useAuth({ enabled }:{ enabled: boolean }) {
  const { data: user, isLoading, isError } = useQuery<AuthUser>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: getMe,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 min
    enabled
  });

  const queryClient = useQueryClient();
  const router = useRouter();

  async function signOut() {
    await logout();
    queryClient.clear();
    router.push("/signin");
  }

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !isError && !!user,
    signOut,
  };
}
