import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, Users, Activity, BellRing, FileBarChart, Settings, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { RenalLogo } from "@/components/RenalLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";

export const Route = createFileRoute("/nurse")({
  component: NurseLayout,
  ssr: false,
});

const nav: { to: string; label: string; icon: typeof Home; exact?: boolean }[] = [
  { to: "/nurse", label: "Dashboard", icon: Home, exact: true },
  { to: "/nurse/patients", label: "Patients", icon: Users },
  { to: "/nurse/sessions", label: "Active Sessions", icon: Activity },
  { to: "/nurse/alerts", label: "Alerts", icon: BellRing },
  { to: "/nurse/reports", label: "Reports", icon: FileBarChart },
  { to: "/nurse/settings", label: "Settings", icon: Settings },
];

function NurseLayout() {
  const { user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (role && role !== "nurse") navigate({ to: "/patient" });
  }, [user, role, loading, navigate]);

  if (loading || !user || role !== "nurse") {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading workspace…</div>;
  }

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen flex bg-background">
      <aside className={`${collapsed ? "w-16" : "w-60"} hidden md:flex flex-col border-r border-border bg-sidebar transition-all`}>
        <div className="h-16 flex items-center px-4 border-b border-border">
          {!collapsed ? <RenalLogo /> : <RenalLogo className="[&_span]:hidden" />}
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const active = item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 h-10 rounded-lg px-3 text-sm transition ${active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <button onClick={handleSignOut} className="flex items-center gap-3 h-10 w-full rounded-lg px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition">
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center gap-3 px-6 border-b border-border bg-card/50 backdrop-blur">
          <button onClick={() => setCollapsed((c) => !c)} className="md:inline-flex hidden h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground">
            <Menu className="h-4 w-4" />
          </button>
          <div className="md:hidden"><RenalLogo /></div>
          <div className="flex-1" />
          <ThemeToggle />
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary grid place-items-center text-sm font-medium">
            {user.email?.[0]?.toUpperCase() ?? "N"}
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
