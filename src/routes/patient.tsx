import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Home, Activity, CalendarClock, User, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { RenalLogo } from "@/components/RenalLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";

export const Route = createFileRoute("/patient")({ component: PatientLayout, ssr: false });

const tabs = [
  { to: "/patient", label: "Home", icon: Home, exact: true },
  { to: "/patient/vitals", label: "My Vitals", icon: Activity },
  { to: "/patient/sessions", label: "Sessions", icon: CalendarClock },
  { to: "/patient/profile", label: "Profile", icon: User },
];

function PatientLayout() {
  const { user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: s => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (role && role !== "patient") navigate({ to: "/nurse" });
  }, [user, role, loading, navigate]);

  if (loading || !user || role !== "patient") {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  }

  const handleSignOut = async () => { await signOut(); toast.success("Signed out"); navigate({ to: "/auth" }); };

  return (
    <div className="min-h-screen flex flex-col bg-background max-w-md mx-auto md:max-w-lg">
      <header className="h-16 flex items-center px-5 border-b border-border">
        <RenalLogo />
        <div className="flex-1" />
        <ThemeToggle />
        <button onClick={handleSignOut} className="ml-2 h-9 w-9 grid place-items-center rounded-lg border border-border text-muted-foreground">
          <LogOut className="h-4 w-4" />
        </button>
      </header>
      <main className="flex-1 px-5 py-6 pb-28 overflow-auto"><Outlet /></main>
      <nav className="fixed bottom-0 inset-x-0 mx-auto max-w-md md:max-w-lg border-t border-border bg-card/95 backdrop-blur">
        <div className="grid grid-cols-4">
          {tabs.map(t => {
            const active = t.exact ? pathname === t.to : pathname === t.to || pathname.startsWith(t.to + "/");
            return (
              <Link key={t.to} to={t.to} className={`flex flex-col items-center gap-1 py-3 text-[11px] ${active ? "text-primary" : "text-muted-foreground"}`}>
                <t.icon className="h-5 w-5" />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
