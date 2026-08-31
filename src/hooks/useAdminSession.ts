import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { callRpc } from "@/lib/admin/db";

export type AdminRole = "OWNER" | "ADMIN" | "STAFF" | "TECHNICIAN";

export type AdminSession = {
  userId: string;
  email: string | null;
  name: string | null;
  roles: AdminRole[];
  active: boolean;
};

/**
 * Loads the signed-in staff member, making sure a profile row exists.
 * The first person to sign in becomes the shop OWNER.
 */
export function useAdminSession() {
  return useQuery<AdminSession | null>({
    queryKey: ["admin", "session"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return null;
      const result = await callRpc<{
        user_id: string;
        roles: AdminRole[];
        active: boolean;
      }>("ensure_profile", {
        _full_name: (user.user_metadata?.["full_name"] as string) ?? null,
        _email: user.email ?? null,
      });
      return {
        userId: user.id,
        email: user.email ?? null,
        name: (user.user_metadata?.["full_name"] as string) ?? null,
        roles: result?.roles ?? [],
        active: result?.active ?? false,
      };
    },
  });
}

export function isManager(session: AdminSession | null | undefined) {
  return !!session?.roles.some((r) => r === "OWNER" || r === "ADMIN");
}
