import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "./auth";
import { trpc } from "./api";

/**
 * Garde de session partagée par les groupes de routes protégées.
 * - pas de session → écran de bienvenue ;
 * - session valide mais onboarding incomplet → onboarding ;
 * - sinon, l'écran peut s'afficher.
 */
export function useSessionGate() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const session = useAuthStore((state) => state.session);
  const clearSession = useAuthStore((state) => state.clearSession);
  const router = useRouter();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: Boolean(session),
    retry: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!hydrated) return;
    if (!session) {
      router.replace("/bienvenue");
      return;
    }
    if (meQuery.data && !meQuery.data.profile.onboardingCompleted) {
      router.replace("/onboarding");
    }
  }, [hydrated, session, meQuery.data, router]);

  useEffect(() => {
    if (!meQuery.error) return;
    const message = meQuery.error.message;
    if (/UNAUTHORIZED|session a expiré|Compte introuvable/i.test(message)) {
      void clearSession();
    }
  }, [meQuery.error, clearSession]);

  const loading =
    !hydrated || (Boolean(session) && meQuery.isLoading && !meQuery.data);

  return {
    loading,
    me: meQuery.data,
    meError: meQuery.error,
    session,
    refetchMe: meQuery.refetch,
  };
}
