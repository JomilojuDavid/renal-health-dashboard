import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "nurse" | "patient" | null;
type Ctx = {
  user: User | null;
  session: Session | null;
  role: Role;
  loading: boolean;
  refreshRole: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  const loadRole = async (uid: string | undefined) => {
    if (!uid) return setRole(null);
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle();
    let next = (data?.role as Role) ?? null;

    // Social sign-in (Google) has no role metadata: claim the role the user
    // picked on the auth screen. The DB policy only allows this once.
    if (!next && typeof window !== "undefined") {
      const pending = window.localStorage.getItem("renalwatch:pending-role");
      if (pending === "nurse" || pending === "patient") {
        const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: pending });
        window.localStorage.removeItem("renalwatch:pending-role");
        if (!error) next = pending;
      }
    }
    setRole(next);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      // If the user arrived via a password-recovery email link, force them
      // to the reset page regardless of where Supabase dropped them.
      if (event === "PASSWORD_RECOVERY" && typeof window !== "undefined") {
        if (window.location.pathname !== "/reset-password") {
          window.location.replace("/reset-password");
          return;
        }
      }
      setSession(s);
      setUser(s?.user ?? null);
      setTimeout(() => loadRole(s?.user?.id), 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      loadRole(data.session?.user?.id).finally(() => setLoading(false));
    });
    return () => sub.subscription.unsubscribe();
  }, []);


  return (
    <AuthCtx.Provider
      value={{
        user,
        session,
        role,
        loading,
        refreshRole: () => loadRole(user?.id),
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
};
